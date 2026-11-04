import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import { tokenHash } from '../src/lib/tokens.js';
import { landingState, landingChat, landingPublish, landingPhoto, editLink } from '../src/lib/landing-api.js';

const ENV = { ANTHROPIC_API_KEY: 'k', POPBILL_LINK_ID: 'x', POPBILL_SECRET_KEY: 'x', POPBILL_CORP_NUM: 'x', POPBILL_SENDER: 'x', OTP_PEPPER: 'pep' };
const post = (body) => new Request('http://x/', { method: 'POST', body: JSON.stringify(body) });

async function setup(status = 'draft') {
  const D1 = makeD1();
  D1.db.exec("INSERT INTO dongs (slug,name,gu) VALUES ('dongnam-mokcheon-eup','목천읍','dongnam')");
  D1.db.exec("INSERT INTO businesses (id,name,trade,dong_id,source,claimed) VALUES (1,'테스트','clean',1,'self',1)");
  D1.db.prepare("INSERT INTO landings (business_id,slug,status,owner_phone,content,areas,edit_token_hash) VALUES (1,'s1',?,'01011112222','{\"name\":\"테스트\"}','[]',?)").run(status, await tokenHash('tok-1'));
  const R2 = { puts: [], bodies: {}, put: async (k, v) => { R2.puts.push(k); R2.bodies[k] = v; }, delete: async (k) => { R2.puts = R2.puts.filter((x) => x !== k); } };
  return { env: { ...ENV, D1, R2 }, D1, R2 };
}
const row = (D1) => D1.db.prepare('SELECT * FROM landings').get();

test('chat rejects unknown token', async () => {
  const { env } = await setup();
  const r = await landingChat(post({ token: 'nope', message: 'hi' }), env, { chat: async () => ({}) });
  assert.equal(r.status, 404);
});
test('chat 503 without ANTHROPIC_API_KEY', async () => {
  const { env } = await setup();
  const r = await landingChat(post({ token: 'tok-1', message: 'hi' }), { ...env, ANTHROPIC_API_KEY: undefined });
  assert.equal(r.status, 503); assert.match((await r.json()).error, /ANTHROPIC_API_KEY/);
});
test('chat and publish refuse held landing', async () => {
  const { env } = await setup('held');
  const c = await landingChat(post({ token: 'tok-1', message: 'hi' }), env, { chat: async () => assert.fail('no call') });
  assert.equal(c.status, 403); assert.match((await c.json()).error, /확인 중이에요/);
  assert.equal((await landingPublish(post({ token: 'tok-1' }), env)).status, 403);
  assert.equal(row(env.D1).status, 'held');
});
test('chat applies update; no tool call keeps draft; error keeps draft', async (tc) => {
  tc.mock.method(console, 'error', () => {});
  const { env, D1 } = await setup();
  const ok = await landingChat(post({ token: 'tok-1', message: '입주청소 해요' }), env, { chat: async () => ({ toolInput: { reply: '좋아요', update: { services: [{ title: '입주청소', detail: '' }], areas: ['dongnam-mokcheon-eup', 'x'] } } }) });
  const j = await ok.json();
  assert.equal(j.reply, '좋아요'); assert.match(j.preview, /입주청소/);
  assert.deepEqual(JSON.parse(row(D1).areas), ['dongnam-mokcheon-eup']);
  const before = row(D1).content;
  const t = await (await landingChat(post({ token: 'tok-1', message: 'a' }), env, { chat: async () => ({ text: '그냥 글' }) })).json();
  assert.equal(t.reply, '그냥 글'); assert.equal(row(D1).content, before);
  const e = await (await landingChat(post({ token: 'tok-1', message: 'a' }), env, { chat: async () => { throw new Error('timeout'); } })).json();
  assert.match(e.reply, /잠깐 문제가 생겼어요/); assert.equal(row(D1).content, before);
});
test('publish sets status, reviewed_at, game_consent', async () => {
  const { env, D1 } = await setup();
  assert.equal((await landingPublish(post({ token: 'tok-1', gameConsent: true }), env)).status, 200);
  const r = row(D1);
  assert.equal(r.status, 'published'); assert.ok(r.reviewed_at); assert.equal(r.game_consent, 1);
});
test('relink needs pepper; sms failure keeps no row', async () => {
  const { env, D1 } = await setup();
  const r = await editLink(post({ phone: '01011112222' }), { ...env, OTP_PEPPER: '' }, {});
  assert.equal(r.status, 503);
  const f = await editLink(post({ phone: '01011112222' }), env, { sendSMS: async () => { throw new Error('x'); } });
  assert.equal(f.status, 502); assert.equal(D1.db.prepare('SELECT count(*) c FROM otps').get().c, 0);
});

const upload = async (env, bytes, { token = 'tok-1', len } = {}) => {
  const fd = new FormData(); fd.append('token', token); fd.append('file', new File([bytes], 'a.png', { type: 'image/png' }));
  const r = new Response(fd);
  const buf = await r.arrayBuffer();
  const headers = { 'content-type': r.headers.get('content-type') };
  if (len !== null) headers['content-length'] = String(len ?? buf.byteLength);
  return landingPhoto(new Request('http://x/', { method: 'POST', body: buf, headers }), env);
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

test('photo: magic bytes, size, content-length, count limits', async () => {
  const { env, D1, R2 } = await setup();
  assert.equal((await upload(env, new TextEncoder().encode('<svg onload=1>'))).status, 415);
  assert.equal((await upload(env, PNG, { len: null })).status, 413);
  assert.equal((await upload(env, PNG, { len: 9 * 1024 * 1024 })).status, 413);
  assert.equal((await upload(env, new Uint8Array(8 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await upload(env, PNG)).status, 200);
  assert.match(R2.puts[0], /^landings\/1\/[0-9a-f-]{36}\.png$/);
  for (let i = 0; i < 9; i++) assert.equal((await upload(env, PNG)).status, 200);
  assert.equal((await upload(env, PNG)).status, 400);
  assert.equal(JSON.parse(row(D1).content).photos.length, 10);
  assert.equal(R2.puts.length, 10); // rejected upload removed from R2
});
test('photo refuses held landing', async () => {
  const { env } = await setup('held');
  assert.equal((await upload(env, PNG)).status, 403);
});
test('chat never drops a photo uploaded during the model wait', async () => {
  const { env, D1 } = await setup();
  const r = await landingChat(post({ token: 'tok-1', message: 'x' }), env, { chat: async () => {
    await upload(env, PNG);
    return { toolInput: { reply: 'ok', update: { intro: '안녕' } } };
  } });
  assert.equal(r.status, 200);
  const c = JSON.parse(row(D1).content);
  assert.equal(c.photos.length, 1); assert.equal(c.intro, '안녕');
});
test('area question reachable from a home-dong areas column; name locked; dong names shown', async () => {
  const { env, D1 } = await setup();
  D1.db.exec("UPDATE landings SET areas = '[\"dongnam-mokcheon-eup\"]', content = '{\"services\":[{\"title\":\"a\",\"detail\":\"\"}],\"excludes\":[],\"extraCosts\":[]}'");
  const st = await (await landingState(post({ token: 'tok-1' }), env)).json();
  assert.match(st.next, /동네/);
  const j = await (await landingChat(post({ token: 'tok-1', message: 'x' }), env, { chat: async () => ({ toolInput: { reply: 'r', update: { name: '해킹', areas: ['dongnam-mokcheon-eup'] } } }) })).json();
  assert.doesNotMatch(j.next ?? '', /동네를 알려/);
  assert.equal(JSON.parse(row(D1).content).name, undefined);
  assert.match(j.preview, /<h1>테스트<\/h1>/); assert.match(j.preview, /목천읍/); assert.doesNotMatch(j.preview, /dongnam-mokcheon/);
  assert.doesNotMatch(j.preview, /areasConfirmed/);
});
test('chat prompt lists dong name=slug pairs, no name key; unknown areas keep the old ones', async () => {
  const { env, D1 } = await setup();
  D1.db.exec("UPDATE landings SET areas = '[\"dongnam-mokcheon-eup\"]'");
  let system = '';
  const chat = async (e, req) => { system = req.system; return { toolInput: { reply: 'r', update: { areas: ['seobuk-buldang-dong', 'buldang-1-dong'] } } }; };
  await landingChat(post({ token: 'tok-1', message: '불당동이요' }), env, { chat });
  assert.match(system, /불당1동=seobuk-buldang-1-dong/); assert.match(system, /목천읍=dongnam-mokcheon-eup/);
  assert.match(system, /update 키: tagline,/);
  assert.deepEqual(JSON.parse(row(D1).areas), ['dongnam-mokcheon-eup']);
  assert.equal(JSON.parse(row(D1).content).areasConfirmed, undefined);
  await landingChat(post({ token: 'tok-1', message: '불당1동이요' }), env, { chat: async () => ({ toolInput: { reply: 'r', update: { areas: ['불당1동'] } } }) });
  assert.deepEqual(JSON.parse(row(D1).areas), ['seobuk-buldang-1-dong']);
  assert.equal(JSON.parse(row(D1).content).areasConfirmed, true);
});
test('failed chat replies are flagged so the client skips history', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { env } = await setup();
  const j = await (await landingChat(post({ token: 'tok-1', message: 'a' }), env, { chat: async () => { throw new Error('anthropic 500'); } })).json();
  assert.equal(j.failed, true);
});

test('relink: known and unknown phones are indistinguishable; new token works, old dies', async () => {
  const { env, D1 } = await setup();
  const sent = [];
  const deps = { sendSMS: async (e, to, t) => { sent.push(t); } };
  const start = async (phone) => { const r = await editLink(post({ phone }), env, deps); return { status: r.status, ...(await r.json()) }; };
  const shape = (h) => h.replace(/^\d+/, 'N').replace(/[A-Za-z0-9_-]{43}$/, 'T');
  const unknown = await start('01000000000');
  assert.equal(sent.length, 0);
  const known = await start('01011112222');
  assert.equal(sent.length, 1);
  assert.equal(known.status, unknown.status); assert.equal(shape(known.handle), shape(unknown.handle)); assert.equal(known.message, unknown.message);
  assert.equal((await start('01000000000')).status, 429); assert.equal((await start('01011112222')).status, 429); // same cooldown
  // wrong code: same status sequence, then locked (410) for both
  const wrong = '12345a'.replace('a', '6');
  const seq = async (handle) => { const out = []; for (let i = 0; i < 5; i++) out.push((await editLink(post({ handle, code: wrong === sent[0].match(/\d{6}/)[0] ? '654321' : wrong }), env, deps)).status); return out; };
  assert.deepEqual(await seq(known.handle), [400, 400, 400, 400, 410]);
  assert.deepEqual(await seq(unknown.handle), [400, 400, 400, 400, 410]);
  assert.equal(D1.db.prepare('SELECT count(*) c FROM otps').get().c, 0);
  // real success path
  D1.db.exec('DELETE FROM otps');
  const again = await (await editLink(post({ phone: '01011112222' }), env, deps)).json();
  const code = sent.at(-1).match(/\d{6}/)[0];
  const ok = await (await editLink(post({ handle: again.handle, code }), env, deps)).json();
  assert.match(ok.editUrl, /^\/edit#t=[A-Za-z0-9_-]{43}$/);
  assert.equal((await landingPublish(post({ token: 'tok-1' }), env)).status, 404);
  assert.equal((await landingPublish(post({ token: ok.editUrl.split('=')[1] }), env)).status, 200);
  assert.equal((await editLink(post({ handle: again.handle, code }), env, deps)).status, 404);
});

test('editor state carries the public slug', async () => {
  const { env } = await setup('published');
  const j = await (await landingState(post({ token: 'tok-1' }), env)).json();
  assert.equal(j.slug, 's1'); assert.equal(j.status, 'published');
});

test('editor calls use their own rate-limit bucket (e:<ip>)', async () => {
  const { env } = await setup();
  const keys = [];
  env.LIMIT = { limit: async ({ key }) => { keys.push(key); return { success: true }; } };
  const req = (b) => new Request('http://x/', { method: 'POST', body: JSON.stringify(b), headers: { 'cf-connecting-ip': '1.2.3.4' } });
  await landingState(req({ token: 'tok-1' }), env);
  await editLink(req({ phone: '01000000000' }), env, { sendSMS: async () => {} });
  assert.deepEqual(keys.slice(0, 2), ['e:1.2.3.4', 'e:1.2.3.4']);
});

test('relink finds a landing without a token unless it is held', async () => {
  const { env, D1 } = await setup();
  D1.db.exec('UPDATE landings SET edit_token_hash = NULL'); // e.g. a held claim the operator approved
  const sent = [];
  const deps = { sendSMS: async (e, to, t) => { sent.push(t); } };
  const h = await (await editLink(post({ phone: '01011112222' }), env, deps)).json();
  assert.equal(sent.length, 1);
  assert.equal(sent[0], `[로컬브릿지AI_천안] 인증번호: ${sent[0].match(/\d{6}/)[0]} (5분 안에 입력해 주세요)`);
  const ok = await (await editLink(post({ handle: h.handle, code: sent[0].match(/\d{6}/)[0] }), env, deps)).json();
  assert.equal((await landingState(post({ token: ok.editUrl.split('=')[1] }), env)).status, 200);
  D1.db.exec("UPDATE landings SET status = 'held'; DELETE FROM otps");
  await editLink(post({ phone: '01011112222' }), env, deps);
  assert.equal(sent.length, 1); // held: decoy, no SMS
});

// SOI, APP0 JFIF, APP1 EXIF (orientation 6 + fake GPS text), APP1 XMP, DQT, SOS + data, EOI
const seg = (m, payload) => [0xff, m, (payload.length + 2) >> 8, (payload.length + 2) & 255, ...payload];
const ascii = (t) => [...new TextEncoder().encode(t)];
const exif = [...ascii('Exif'), 0, 0, 0x49, 0x49, 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, ...ascii('GPS-SECRET')];
const JPEG = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...seg(0xe1, exif),
  ...seg(0xe1, ascii('http://ns.adobe.com/xap/1.0/\0GPSLatitude')), ...seg(0xdb, [0, 1]), ...seg(0xda, [1, 2, 3]), 0x12, 0xff, 0x00, 0x34, 0xff, 0xd9]);

test('jpeg upload drops EXIF/XMP but keeps orientation; png untouched', async () => {
  const { env, R2 } = await setup();
  assert.equal((await upload(env, JPEG)).status, 200);
  const out = Buffer.from(R2.bodies[R2.puts[0]]);
  assert.ok(!out.includes('GPS'));
  assert.ok(out.includes('JFIF'));
  const at = out.indexOf(Buffer.from([0xff, 0xe1]));
  assert.deepEqual([...out.subarray(at, at + 36)], [0xff, 0xe1, 0, 34, ...ascii('Exif'), 0, 0, 0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 1, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
  assert.equal(out.indexOf(Buffer.from([0xff, 0xe1]), at + 1), -1);
  assert.deepEqual([...out.subarray(-14)], [...JPEG.subarray(-14)]); // DQT, scan and data copied as is
  assert.equal((await upload(env, PNG)).status, 200);
  assert.deepEqual([...R2.bodies[R2.puts[1]]], [...PNG]);
});
