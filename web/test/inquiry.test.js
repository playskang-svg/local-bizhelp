import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import { validateInquiry, isDuplicate, needsReminder, submitInquiry, runCron } from '../src/lib/inquiry.js';
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

test('ack sets ack_at once and page has no personal data', async () => {
  const { post, rows, sent, env } = setup();
  await post({});
  const tok = sent[0].text.match(/ack\/([\w-]+)$/)[1];
  const r1 = await ackPage(env, tok);
  assert.equal(r1.status, 200);
  assert.match(r1.headers.get('cache-control'), /no-store/);
  const html = await r1.text();
  assert.match(html, /기록했어요\. 손님께 연락해 주셔서 고마워요\./);
  assert.match(html, /noindex/); assert.doesNotMatch(html, /01099990000/);
  const first = rows()[0].ack_at;
  assert.ok(first);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await ackPage(env, tok)).status, 200);
  assert.equal(rows()[0].ack_at, first);
  assert.equal(await ackPage(env, 'wrongtoken'), null);
});

test('scheduled: one reminder for old un-acked, deletes expired otps', async () => {
  const { post, rows, sent, D1, env, deps } = setup();
  await post({});
  await post({ phone: '010-1111-2222' });
  await post({ phone: '010-3333-4444' });
  await post({ phone: '010-5555-1111' });
  const old = new Date(Date.now() - 13 * 3600e3).toISOString();
  D1.db.exec(`UPDATE inquiries SET created_at='${old}' WHERE id IN (1,2,3)`);
  const tok2 = null; void tok2;
  const tok3 = sent[2].text.match(/ack\/([\w-]+)$/)[1];
  await ackPage(env, tok3); // inquiry 3 acked
  D1.db.exec("UPDATE inquiries SET valid=0 WHERE id=2");
  const n = Date.now();
  D1.db.exec(`INSERT INTO otps (phone_hash, code_hash, purpose, payload, expires_at, attempts) VALUES ('a','b','claim','{}',${n - 1000},0),('c','d','claim','{}',${n + 100000},0)`);
  sent.length = 0;
  await runCron(env, deps, n);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /01099990000/);
  assert.ok(rows()[0].reminded_at);
  assert.equal(D1.db.prepare('SELECT count(*) c FROM otps').get().c, 1);
  await runCron(env, deps, n + 1000);
  assert.equal(sent.length, 1);
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
