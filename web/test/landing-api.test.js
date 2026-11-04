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
  const R2 = { puts: [], put: async (k) => { R2.puts.push(k); }, delete: async (k) => { R2.puts = R2.puts.filter((x) => x !== k); } };
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
test('chat applies update; no tool call keeps draft; error keeps draft', async () => {
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
test('failed chat replies are flagged so the client skips history', async () => {
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
