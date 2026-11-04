import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import { claimVerify, claimConfirm } from '../src/lib/claim.js';

const SHOP = { trade: 'clean', dong: 'dongnam-buk-myeon', name: '테스트청소', bNo: '1234567891', startDt: '20200315', pNm: '홍길동', phone: '01099990000' };

function setup() {
  const D1 = makeD1();
  D1.db.exec("INSERT INTO dongs (slug, name, gu) VALUES ('dongnam-buk-myeon', '북면', 'dongnam')");
  const env = { D1, DATA_GO_KEY: 'x', POPBILL_LINK_ID: 'x', POPBILL_SECRET_KEY: 'x', POPBILL_CORP_NUM: 'x', POPBILL_SENDER: 'x', OTP_PEPPER: 'test-pepper' };
  const sent = [];
  const deps = { ntsValidate: async () => ({ ok: true }), sendSMS: async (e, to, text) => { sent.push(text); } };
  const post = (body) => new Request('http://x/', { method: 'POST', body: JSON.stringify(body) });
  const verify = async (shop = SHOP) => {
    const r = await claimVerify(post(shop), env, deps);
    return { status: r.status, ...(await r.json()), code: sent.at(-1)?.match(/\d{6}/)?.[0] };
  };
  const confirm = async (claimId, code) => {
    const r = await claimConfirm(post({ claimId, code }), env);
    return { status: r.status, ...(await r.json()) };
  };
  const count = (t) => D1.db.prepare(`SELECT count(*) c FROM ${t}`).get().c;
  return { env, verify, confirm, count, D1 };
}

test('wrong code increments attempts; 5th wrong locks and deletes', async () => {
  const { verify, confirm, count, D1 } = setup();
  const v = await verify();
  assert.equal(v.status, 200);
  const wrong = v.code === '000000' ? '111111' : '000000';
  for (let i = 1; i <= 4; i++) {
    assert.equal((await confirm(v.claimId, wrong)).status, 400);
    assert.equal(D1.db.prepare('SELECT attempts FROM otps').get().attempts, i);
  }
  const fifth = await confirm(v.claimId, wrong);
  assert.equal(fifth.status, 410);
  assert.match(fifth.error, /여러 번 틀렸어요/);
  assert.equal(count('otps'), 0);
  assert.equal((await confirm(v.claimId, v.code)).status, 404);
});

test('correct code works once; same handle fails the second time', async () => {
  const { verify, confirm, count } = setup();
  const v = await verify();
  const ok = await confirm(v.claimId, v.code);
  assert.equal(ok.status, 200);
  assert.match(ok.editUrl, /^\/edit#t=[A-Za-z0-9_-]{43}$/);
  assert.equal(count('businesses'), 1);
  assert.equal(count('landings'), 1);
  assert.equal((await confirm(v.claimId, v.code)).status, 404);
  assert.equal(count('landings'), 1);
});

test('tampered handle is rejected and burns no attempt', async () => {
  const { verify, confirm, D1 } = setup();
  const v = await verify();
  const [id] = v.claimId.split('.');
  assert.equal((await confirm(`${id}.AAAA`, v.code)).status, 404);
  assert.equal((await confirm(id, v.code)).status, 400);
  assert.equal(D1.db.prepare('SELECT attempts FROM otps').get().attempts, 0);
});

test('second claim of a claimed shop is held and creates no business', async () => {
  const { verify, confirm, count, D1 } = setup();
  const a = await verify();
  assert.equal((await confirm(a.claimId, a.code)).status, 200);
  const b = await verify({ ...SHOP, phone: '01088880000' });
  const held = await confirm(b.claimId, b.code);
  assert.deepEqual({ held: held.held, status: held.status }, { held: true, status: 200 });
  assert.equal(count('businesses'), 1);
  const rows = D1.db.prepare('SELECT business_id, status, edit_token_hash FROM landings ORDER BY id').all();
  assert.deepEqual(rows.map((r) => [r.business_id, r.status]), [[1, 'draft'], [1, 'held']]);
  assert.equal(rows[1].edit_token_hash, null);
});

test('60 s cooldown blocks a second verify for the same phone', async () => {
  const { verify, count } = setup();
  assert.equal((await verify()).status, 200);
  const again = await verify();
  assert.equal(again.status, 429);
  assert.match(again.error, /잠시 뒤에 다시 받아 주세요/);
  assert.equal(count('otps'), 1);
});
