import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import { tokenHash } from '../src/lib/tokens.js';
import { landingChat, landingPublish, landingPhoto, editLink } from '../src/lib/landing-api.js';

const ENV = { ANTHROPIC_API_KEY: 'k', POPBILL_LINK_ID: 'x', POPBILL_SECRET_KEY: 'x', POPBILL_CORP_NUM: 'x', POPBILL_SENDER: 'x', OTP_PEPPER: 'pep' };
const post = (body) => new Request('http://x/', { method: 'POST', body: JSON.stringify(body) });

async function setup(status = 'draft') {
  const D1 = makeD1();
  D1.db.exec("INSERT INTO dongs (slug,name,gu) VALUES ('dongnam-mokcheon-eup','목천읍','dongnam')");
  D1.db.exec("INSERT INTO businesses (id,name,trade,dong_id,source,claimed) VALUES (1,'테스트','clean',1,'self',1)");
  D1.db.prepare("INSERT INTO landings (business_id,slug,status,owner_phone,content,areas,edit_token_hash) VALUES (1,'s1',?,'01011112222','{\"name\":\"테스트\"}','[]',?)").run(status, await tokenHash('tok-1'));
  const R2 = { puts: [], put: async (k, v) => { R2.puts.push(k); } };
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
test('photo: magic bytes, size and count limits', async () => {
  const { env, D1, R2 } = await setup();
  const up = (bytes, type = 'image/png') => {
    const fd = new FormData(); fd.append('token', 'tok-1'); fd.append('file', new File([bytes], 'a.png', { type }));
    return landingPhoto(new Request('http://x/', { method: 'POST', body: fd }), env);
  };
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  assert.equal((await up(new TextEncoder().encode('<svg onload=1>'))).status, 415);
  assert.equal((await up(new Uint8Array(8 * 1024 * 1024 + 1))).status, 413);
  const ok = await up(png);
  assert.equal(ok.status, 200);
  assert.match(R2.puts[0], /^landings\/1\/[0-9a-f-]{36}\.png$/);
  assert.equal(JSON.parse(row(D1).content).photos.length, 1);
  for (let i = 0; i < 9; i++) assert.equal((await up(png)).status, 200);
  assert.equal((await up(png)).status, 400);
});

test('relink: new token works, old token dies, unknown phone looks the same', async () => {
  const { env, D1 } = await setup();
  const sent = [];
  const deps = { sendSMS: async (e, to, t) => { sent.push(t); } };
  const start = async (phone) => (await editLink(post({ phone }), env, deps)).json();
  const unknown = await start('01000000000');
  assert.equal(sent.length, 0); assert.ok(unknown.handle);
  const s = await start('01011112222');
  assert.equal(s.message, unknown.message);
  const code = sent[0].match(/\d{6}/)[0];
  assert.equal((await editLink(post({ phone: '01011112222' }), env, deps)).status, 429);
  const bad = await editLink(post({ handle: s.handle, code: code === '000000' ? '111111' : '000000' }), env, deps);
  assert.equal(bad.status, 400);
  const ok = await (await editLink(post({ handle: s.handle, code }), env, deps)).json();
  assert.match(ok.editUrl, /^\/edit#t=[A-Za-z0-9_-]{43}$/);
  const newTok = ok.editUrl.split('=')[1];
  assert.equal((await landingPublish(post({ token: 'tok-1' }), env)).status, 404);
  assert.equal((await landingPublish(post({ token: newTok }), env)).status, 200);
  assert.equal(D1.db.prepare('SELECT count(*) c FROM otps').get().c, 0);
  assert.equal((await editLink(post({ handle: s.handle, code }), env, deps)).status, 404);
});
test('relink needs pepper; sms failure keeps no row', async () => {
  const { env, D1 } = await setup();
  const r = await editLink(post({ phone: '01011112222' }), { ...env, OTP_PEPPER: '' }, {});
  assert.equal(r.status, 503);
  const f = await editLink(post({ phone: '01011112222' }), env, { sendSMS: async () => { throw new Error('x'); } });
  assert.equal(f.status, 502); assert.equal(D1.db.prepare('SELECT count(*) c FROM otps').get().c, 0);
});
