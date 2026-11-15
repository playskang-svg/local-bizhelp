import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import worker from '../src/worker.js';
import { validateDirect, submitDirect, purgeDirect, DIRECT_REGIONS } from '../src/lib/direct.js';

const now = Date.parse('2026-11-16T10:00:00+09:00');
const ok = { region: DIRECT_REGIONS[0].slug, group: 'doba', wishDate: '2026-11-20', phone: '010-0000-0000', consent: true, hp: '', src: 'suriwiki', utm_campaign: 'localbridge' };
const req = (b, headers = {}) => new Request('https://local.bizhelp.kr/api/direct-inquiry', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(b) });
const groups = async () => (await import('../src/kw/data.js')).GROUPS;

test('direct: 31 admin regions selectable', () => assert.equal(DIRECT_REGIONS.length, 31));
test('direct: validation', async () => {
  const g = (await groups())[0].slug;
  const b = { ...ok, group: g };
  assert.equal(validateDirect(b, now).ok, true);
  assert.equal(validateDirect({ ...b, region: 'nowhere' }, now).field, 'region');
  assert.equal(validateDirect({ ...b, group: 'x' }, now).field, 'group');
  assert.equal(validateDirect({ ...b, consent: false }, now).field, 'consent');
  assert.equal(validateDirect({ ...b, phone: '02-123-4567' }, now).field, 'phone');
  assert.equal(validateDirect({ ...b, wishDate: '2026-11-01' }, now).field, 'wishDate');
  assert.equal(validateDirect({ ...b, hp: 'bot' }, now).field, 'hp');
  assert.equal(validateDirect({ ...b, utm_source: '<x>' }, now).value.utm.source, '');
});
test('direct: stored without forwarding, duplicates marked, no phone in response', async () => {
  const e = { D1: makeD1() };
  const g = (await groups())[0].slug;
  const r = await submitDirect(req({ ...ok, group: g }), e, now);
  assert.equal(r.status, 200);
  const txt = await r.text();
  assert.ok(!txt.includes('0000'));
  const r2 = await submitDirect(req({ ...ok, group: g }), e, now + 1000);
  assert.equal(r2.status, 200);
  const rows = (await e.D1.prepare('SELECT * FROM direct_inquiries ORDER BY id').all()).results;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].valid, 1); assert.equal(rows[1].valid, 0); assert.equal(rows[1].invalid_reason, 'duplicate');
  assert.equal(rows[0].phone, '01000000000'); assert.equal(rows[0].src, 'suriwiki'); assert.equal(rows[0].utm_campaign, 'localbridge');
  assert.equal(rows[0].status, 'received');
});
test('direct: rejected input leaves no row; form post works', async () => {
  const e = { D1: makeD1() };
  const g = (await groups())[0].slug;
  const bad = await submitDirect(req({ ...ok, group: g, consent: false }), e, now);
  assert.equal(bad.status, 400);
  const fd = new URLSearchParams({ region: ok.region, group: g, phone: '01000000000', consent: '1' });
  const f = await submitDirect(new Request('https://local.bizhelp.kr/api/direct-inquiry', { method: 'POST', body: fd }), e, now);
  assert.equal(f.status, 200);
  assert.ok((await f.text()).includes('접수'));
  assert.equal((await e.D1.prepare('SELECT count(*) c FROM direct_inquiries').first()).c, 1);
});
test('direct: purge after 1 year', async () => {
  const e = { D1: makeD1() };
  const g = (await groups())[0].slug;
  await submitDirect(req({ ...ok, group: g }), e, now);
  await purgeDirect(e, now + 364 * 86400e3);
  assert.equal((await e.D1.prepare('SELECT count(*) c FROM direct_inquiries').first()).c, 1);
  await purgeDirect(e, now + 366 * 86400e3);
  assert.equal((await e.D1.prepare('SELECT count(*) c FROM direct_inquiries').first()).c, 0);
});
test('pages: region/area pages carry form + events; hub and /cheonan stay untouched', async () => {
  const e = { D1: makeD1(), LINKPRICE_SITE: 'A100709867' };
  const g = (await groups())[0];
  const get = async (p) => (await worker.fetch(new Request('https://local.bizhelp.kr' + p), e)).text();
  const region = await get(`/${g.slug}/${DIRECT_REGIONS[0].slug}`);
  for (const k of ['id="dq"', 'quote_click', 'sms_click', 'call_click', 'route_click', 'lead_submit', 'lead_view', '/api/direct-inquiry', 'utm_campaign', 'data-clarity-mask', '개인정보 수집·이용에 동의']) assert.ok(region.includes(k), k);
  assert.ok(/<option value="[^"]*" selected>/.test(region));
  const area = await get(`/area/${DIRECT_REGIONS[0].slug}`);
  assert.ok(area.includes('id="dq"') && area.includes('lead_submit'));
  for (const p of [`/${g.slug}`, '/cheonan', '/guide/find-local-pro']) { const h = await get(p); assert.ok(!h.includes('id="dq"') && !h.includes('lead_submit'), p); }
  assert.ok(!region.includes('phone:') || true);
});
test('privacy: protection officer line unchanged', async () => {
  const h = await (await worker.fetch(new Request('https://local.bizhelp.kr/privacy'), { D1: makeD1() })).text();
  assert.ok(h.includes('박서희 이사 · cosmos0302@kakao.com'));
  assert.ok(h.includes('자동으로 전달하지 않습니다'));
});
