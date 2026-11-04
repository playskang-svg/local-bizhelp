import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import { validateInquiry, isDuplicate, needsReminder, submitInquiry, runCron, ackPost } from '../src/lib/inquiry.js';
import { ackPage } from '../src/pages/ack.js';
import worker from '../src/worker.js';

const landing = { areas: ['dongnam-mokcheon-eup'], name: 'A청소' };
const base = { dong: 'dongnam-mokcheon-eup', work: '입주청소', wishDate: '2026-11-10', phone: '010-1234-5678', consent: true, hp: '' };
const now = Date.parse('2026-11-05T00:00:00+09:00');

test('outside service area is rejected', () => {
  const r = validateInquiry({ ...base, dong: 'seobuk-buldang-1-dong' }, landing, now);
  assert.equal(r.ok, false); assert.equal(r.field, 'dong');
});
test('consent required', () => assert.equal(validateInquiry({ ...base, consent: false }, landing, now).field, 'consent'));
test('past date rejected', () => assert.equal(validateInquiry({ ...base, wishDate: '2026-11-01' }, landing, now).field, 'wishDate'));
test('date beyond 180 days and today boundary', () => {
  assert.equal(validateInquiry({ ...base, wishDate: '2027-05-04' }, landing, now).ok, true);
  assert.equal(validateInquiry({ ...base, wishDate: '2027-05-05' }, landing, now).field, 'wishDate');
  assert.equal(validateInquiry({ ...base, wishDate: '2026-11-05' }, landing, now).ok, true);
});
test('honeypot blocks', () => assert.equal(validateInquiry({ ...base, hp: 'x' }, landing, now).ok, false));
test('phone normalized', () => assert.equal(validateInquiry(base, landing, now).value.phone, '01012345678'));
test('reminder once after 12h', () => {
  const t = Date.parse('2026-11-05T00:00:00Z');
  assert.equal(needsReminder({ createdAt: t, ackAt: null, remindedAt: null }, t + 12 * 3600e3), true);
  assert.equal(needsReminder({ createdAt: t, ackAt: null, remindedAt: t + 1 }, t + 13 * 3600e3), false);
  assert.equal(needsReminder({ createdAt: t, ackAt: t + 1, remindedAt: null }, t + 13 * 3600e3), false);
});
test('isDuplicate within 24h only', () => {
  const t = Date.now();
  assert.equal(isDuplicate([{ customerPhone: '01011112222', createdAt: t - 3600e3 }], '01011112222', t), true);
  assert.equal(isDuplicate([{ customerPhone: '01011112222', createdAt: t - 25 * 3600e3 }], '01011112222', t), false);
  assert.equal(isDuplicate([{ customerPhone: '01033334444', createdAt: t - 3600e3 }], '01011112222', t), false);
});

// ---- handler tests ----
const OWNER = '01055556666';
const tomorrow = () => new Date(Date.now() + 33 * 3600e3).toISOString().slice(0, 10);
function setup(over = {}) {
  const D1 = makeD1();
  D1.db.exec(`INSERT INTO dongs (slug, name, gu) VALUES ('dongnam-mokcheon-eup','목천읍','dongnam'),('seobuk-buldang-1-dong','불당1동','seobuk');
    INSERT INTO businesses (name, trade, dong_id, source, claimed) VALUES ('A청소','clean',1,'self',1);
    INSERT INTO landings (business_id, slug, status, owner_phone, areas, content, billing) VALUES (1,'a-pub','published','${OWNER}','["dongnam-mokcheon-eup"]','{}','none'),(1,'a-draft','draft','${OWNER}','["dongnam-mokcheon-eup"]','{}','none')`);
  const env = { D1, POPBILL_LINK_ID: 'x', POPBILL_SECRET_KEY: 'x', POPBILL_CORP_NUM: 'x', POPBILL_SENDER: 'x', OTP_PEPPER: 'pep', ...over };
  const sent = [];
  const deps = { sendLMS: async (e, to, subject, text) => { sent.push({ to, subject, text }); } };
  const post = (b) => submitInquiry(new Request('http://x/', { method: 'POST', body: JSON.stringify({ slug: 'a-pub', dong: 'dongnam-mokcheon-eup', work: '입주청소 24평', wishDate: tomorrow(), phone: '010-9999-0000', consent: true, hp: '', src: 'flyer', ...b }) }), env, deps);
  const rows = () => D1.db.prepare('SELECT * FROM inquiries ORDER BY id').all();
  return { D1, env, sent, deps, post, rows };
}

test('only published landings accept inquiries', async () => {
  const { post, rows } = setup();
  assert.equal((await post({ slug: 'a-draft' })).status, 404);
  assert.equal((await post({ slug: 'nope' })).status, 404);
  assert.equal(rows().length, 0);
});

test('stores, sends LMS with ack link, hashes token', async () => {
  const { post, rows, sent } = setup();
  const r = await post({});
  assert.equal(r.status, 200);
  const [row] = rows();
  assert.equal(row.valid, 1); assert.equal(row.notify_result, 'sent'); assert.equal(row.src, 'flyer');
  assert.equal(row.customer_phone, '01099990000');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, OWNER);
  assert.equal(sent[0].subject, '[로컬브릿지AI_천안] 새 문의');
  assert.match(sent[0].text, /목천읍/); assert.match(sent[0].text, /01099990000/);
  const tok = sent[0].text.match(/https:\/\/local\.bizhelp\.kr\/ack\/([\w-]+)$/)[1];
  assert.notEqual(row.ack_token_hash, tok);
  assert.equal(row.ack_token_hash.length, 64);
});

test('out-of-area rejected before insert', async () => {
  const { post, rows, sent } = setup();
  const r = await post({ dong: 'seobuk-buldang-1-dong' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).field, 'dong');
  assert.equal(rows().length, 0); assert.equal(sent.length, 0);
});

test('duplicate stored invalid, no SMS, same success', async () => {
  const { post, rows, sent } = setup();
  const a = await (await post({})).json();
  const b = await post({});
  assert.deepEqual(await b.json(), a);
  const [, dup] = rows();
  assert.equal(dup.valid, 0); assert.equal(dup.invalid_reason, 'duplicate');
  assert.equal(sent.length, 1);
});

const ackReq = (token) => new Request('http://x/api/ack', { method: 'POST', body: JSON.stringify({ token }) });
const tokOf = (sent, i = 0) => sent[i].text.match(/ack\/([\w-]+)$/)[1];

test('GET ack never writes; POST /api/ack sets ack_at once', async () => {
  const { post, rows, sent, env } = setup();
  await post({});
  const tok = tokOf(sent);
  const r1 = await ackPage(env, tok);
  assert.equal(r1.status, 200);
  assert.match(r1.headers.get('cache-control'), /no-store/);
  const html = await r1.text();
  assert.match(html, /기록했어요\. 손님께 연락해 주셔서 고마워요\./);
  assert.match(html, /noindex/); assert.match(html, /\/api\/ack/); assert.doesNotMatch(html, /01099990000/);
  assert.equal(rows()[0].ack_at, null);
  assert.equal((await ackPost(ackReq(tok), env)).status, 200);
  const first = rows()[0].ack_at;
  assert.ok(first);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await ackPost(ackReq(tok), env)).status, 200);
  assert.equal(rows()[0].ack_at, first);
  assert.equal((await ackPost(ackReq('wrongtoken'), env)).status, 404);
  assert.equal(await ackPage(env, 'wrongtoken'), null);
});

const NOON = Date.parse('2026-11-05T12:00:00+09:00');
async function seedReminders(h) {
  const { post, sent, D1 } = h;
  for (const p of ['010-9999-0000', '010-1111-2222', '010-3333-4444', '010-5555-1111']) await post({ phone: p });
  const old = new Date(NOON - 13 * 3600e3).toISOString();
  D1.db.exec(`UPDATE inquiries SET created_at='${old}' WHERE id IN (1,2,3); UPDATE inquiries SET created_at='${new Date(NOON).toISOString()}' WHERE id=4`);
  return sent.map((x) => ({ ...x }));
}

test('scheduled: one reminder for old un-acked, same text, deletes expired otps', async () => {
  const h = setup();
  const { rows, sent, D1, env, deps } = h;
  const first = await seedReminders(h);
  await ackPost(ackReq(tokOf(sent, 2)), env); // inquiry 3 acked
  D1.db.exec('UPDATE inquiries SET valid=0 WHERE id=2');
  D1.db.exec(`INSERT INTO otps (phone_hash, code_hash, purpose, payload, expires_at, attempts) VALUES ('a','b','claim','{}',${NOON - 1000},0),('c','d','claim','{}',${NOON + 100000},0)`);
  sent.length = 0;
  await runCron(env, deps, NOON);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], first[0]);
  assert.ok(rows()[0].reminded_at);
  assert.equal(D1.db.prepare('SELECT count(*) c FROM otps').get().c, 1);
  await runCron(env, deps, NOON + 1000);
  assert.equal(sent.length, 1);
});

test('reminders skip failed and config-missing rows, unpublished landings; quiet hours wait; max 20', async () => {
  const h = setup();
  const { sent, D1, env, deps } = h;
  await seedReminders(h);
  D1.db.exec("UPDATE inquiries SET notify_result='failed' WHERE id=1; UPDATE inquiries SET notify_result='config-missing' WHERE id=2; UPDATE inquiries SET notify_result='capped' WHERE id=3");
  sent.length = 0;
  await runCron(env, deps, NOON);
  assert.equal(sent.length, 0);
  D1.db.exec("UPDATE inquiries SET notify_result='sent' WHERE id=1");
  const night = Date.parse('2026-11-05T22:00:00+09:00');
  await runCron(env, deps, night);
  assert.equal(sent.length, 0);
  await runCron(env, deps, Date.parse('2026-11-06T07:59:00+09:00'));
  assert.equal(sent.length, 0);
  D1.db.exec("UPDATE landings SET status='draft' WHERE id=1");
  await runCron(env, deps, Date.parse('2026-11-06T08:00:00+09:00'));
  assert.equal(sent.length, 0);
  D1.db.exec("UPDATE landings SET status='published' WHERE id=1");
  await runCron(env, deps, Date.parse('2026-11-06T08:00:00+09:00'));
  assert.equal(sent.length, 2); // ids 1 and 4
  const many = Array.from({ length: 25 }, (_, i) => `(1,'dongnam-mokcheon-eup','x','0100000${String(i).padStart(4, '0')}',1,1,'sent','2026-11-01T00:00:00.000Z')`).join(',');
  D1.db.exec(`INSERT INTO inquiries (landing_id, dong, work, customer_phone, consent, valid, notify_result, created_at) VALUES ${many}`);
  sent.length = 0;
  await runCron(env, deps, Date.parse('2026-11-06T12:00:00+09:00'));
  assert.equal(sent.length, 20);
});

test('honeypot returns 200 and stores nothing; rate limit gives 429', async () => {
  const { post, rows, env, deps } = setup();
  assert.equal((await post({ hp: 'bot' })).status, 200);
  assert.equal(rows().length, 0);
  env.LIMIT = { limit: async () => ({ success: false }) };
  const r = await submitInquiry(new Request('http://x/', { method: 'POST', body: '{}' }), env, deps);
  assert.equal(r.status, 429);
});

test('landing daily cap: 21st inquiry is capped, no SMS, success', async () => {
  const { post, rows, sent, D1 } = setup();
  const many = Array.from({ length: 20 }, (_, i) => `(1,'dongnam-mokcheon-eup','x','0100000${String(i).padStart(4, '0')}',1,1,'sent')`).join(',');
  D1.db.exec(`INSERT INTO inquiries (landing_id, dong, work, customer_phone, consent, valid, notify_result) VALUES ${many}`);
  const r = await post({});
  assert.equal(r.status, 200);
  assert.equal(rows().at(-1).notify_result, 'capped');
  assert.equal(sent.length, 0);
});

test('global daily cap from SMS_DAILY_CAP', async () => {
  const { post, rows, sent } = setup({ SMS_DAILY_CAP: '2' });
  await post({ phone: '010-1000-0001' }); await post({ phone: '010-1000-0002' });
  assert.equal((await post({ phone: '010-1000-0003' })).status, 200);
  assert.deepEqual(rows().map((r) => r.notify_result), ['sent', 'sent', 'capped']);
  assert.equal(sent.length, 2);
});

test('phone rule: 010 needs 8 digits, 011 style 7-8', () => {
  assert.equal(validateInquiry({ ...base, phone: '0101234567' }, landing, now).field, 'phone');
  assert.equal(validateInquiry({ ...base, phone: '01712345678' }, landing, now).ok, true);
  assert.equal(validateInquiry({ ...base, phone: '01212345678' }, landing, now).field, 'phone');
});

test('worker.scheduled runs the cron', async () => {
  const { D1, env } = setup();
  D1.db.exec("INSERT INTO otps (phone_hash, code_hash, purpose, payload, expires_at, attempts) VALUES ('a','b','claim','{}',1,0)");
  await worker.scheduled({}, env, {});
  assert.equal(D1.db.prepare('SELECT count(*) c FROM otps').get().c, 0);
});

test('missing Popbill secret still stores with config-missing', async () => {
  const { post, rows, sent, env } = setup();
  delete env.POPBILL_SECRET_KEY;
  const r = await post({});
  assert.equal(r.status, 200);
  assert.equal(rows()[0].notify_result, 'config-missing');
  assert.equal(sent.length, 0);
});

test('SMS failure still returns success, records failed', async () => {
  const { env, rows } = setup();
  const bad = { sendLMS: async () => { throw new Error('boom'); } };
  const r = await submitInquiry(new Request('http://x/', { method: 'POST', body: JSON.stringify({ slug: 'a-pub', dong: 'dongnam-mokcheon-eup', work: 'x', phone: '01012340000', consent: true }) }), env, bad);
  assert.equal(r.status, 200);
  assert.equal(rows()[0].notify_result, 'failed');
});
