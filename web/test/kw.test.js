import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import worker from '../src/worker.js';
import { GROUPS, REGIONS, regionOf, groupOf } from '../src/kw/data.js';
import { composePage, sectionOrder, josa } from '../src/kw/compose.js';
import { validateLead } from '../src/lib/lead.js';
import { deepLink } from '../src/kw/contact.js';

const env = () => ({ D1: makeD1(), CONSULT_PHONE: '010-1234-5678' });
const get = (e, path) => worker.fetch(new Request('https://local.bizhelp.kr' + path), e);

test('data: 14 groups, 66 Cheonan regions, unique slugs, no route clash', () => {
  assert.equal(GROUPS.length, 14);
  assert.equal(REGIONS.length, 66);
  const all = [...GROUPS.map((g) => g.slug)];
  assert.equal(new Set(all).size, all.length);
  for (const fixed of ['start', 'login', 'auth', 'logout', 'edit', 'p', 'd', 'api', 'ack', 'media', 'privacy', 'admin', 'cms-api', 'area', 'go', 'ba', 'img']) assert.ok(!groupOf(fixed), fixed);
  for (const r of REGIONS) if (r.parent) assert.ok(regionOf(r.parent), r.slug);
});

test('josa', () => {
  assert.equal(josa.eun('불당동'), '불당동은');
  assert.equal(josa.eun('천안역'), '천안역은');
  assert.equal(josa.eun('입장면'), '입장면은');
  assert.equal(josa.wa('신불당'), '신불당과');
  assert.equal(josa.ro('천안터미널'), '천안터미널로');
});

test('compose is deterministic', () => {
  const g = groupOf('dobae-jangpan'), r = regionOf('buldang-1-dong');
  assert.deepEqual(composePage(g, r), composePage(g, r));
});

test('pages in one keyword differ: photos, local sentences, section order', () => {
  for (const g of GROUPS) {
    const sigs = REGIONS.map((r) => { const c = composePage(g, r); return [c.photos.map((p) => p.id).join(), c.local.join(), sectionOrder(g, c.seed).join()].join('|'); });
    const distinct = new Set(sigs).size;
    assert.ok(distinct >= REGIONS.length * 0.9, `${g.slug}: ${distinct}/${REGIONS.length}`);
  }
});

test('every keyword × region page renders with exact-match title, h1, canonical, picker', async () => {
  const e = env();
  const titles = new Set();
  for (const g of GROUPS) {
    for (const r of REGIONS) {
      const res = await get(e, `/${g.slug}/${r.slug}`);
      assert.equal(res.status, 200, `${g.slug}/${r.slug}`);
      const h = await res.text();
      const m = h.match(/<title>([^<]+)<\/title>/);
      assert.ok(m[1].startsWith(`${r.name} ${g.keyword} |`), m[1]);
      titles.add(m[1]);
      assert.ok(h.includes(`<h1>${r.name} ${g.keyword}</h1>`));
      assert.ok(h.includes(`<link rel="canonical" href="https://local.bizhelp.kr/${g.slug}/${r.slug}">`));
      assert.ok(h.includes('체크하고 문자 보내기') && h.includes('sms:01012345678'));
      assert.ok(h.includes('"@type":"FAQPage"') && h.includes('"@type":"BreadcrumbList"'));
      assert.ok(!h.includes('undefined') && !h.includes('NaN'), `${g.slug}/${r.slug} has undefined/NaN`);
    }
  }
  assert.equal(titles.size, GROUPS.length * REGIONS.length);
});

test('hubs, area pages, home', async () => {
  const e = env();
  for (const g of GROUPS) {
    const h = await (await get(e, `/${g.slug}`)).text();
    assert.ok(h.includes(`<h1>천안 ${g.keyword}</h1>`));
    for (const r of REGIONS) assert.ok(h.includes(`href="/${g.slug}/${r.slug}"`), `${g.slug} -> ${r.slug}`);
  }
  for (const r of REGIONS) {
    const res = await get(e, `/area/${r.slug}`);
    assert.equal(res.status, 200, r.slug);
    const h = await res.text();
    for (const g of GROUPS) assert.ok(h.includes(`href="/${g.slug}/${r.slug}"`));
  }
  const home = await (await get(e, '/cheonan')).text();
  for (const g of GROUPS) assert.ok(home.includes(`href="/${g.slug}"`));
  for (const r of REGIONS) assert.ok(home.includes(`href="/area/${r.slug}"`));
});

test('unknown keyword or region is 404; /go redirects', async () => {
  const e = env();
  assert.equal((await get(e, '/dobae-jangpan/seoul')).status, 404);
  assert.equal((await get(e, '/nope')).status, 404);
  assert.equal((await get(e, '/area/nope')).status, 404);
  const r = await get(e, '/go?k=tail-sigong&r=sin-buldang');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), 'https://local.bizhelp.kr/tail-sigong/sin-buldang');
});

test('sitemap lists every keyword page and area page', async () => {
  const t = await (await get(env(), '/sitemap.xml')).text();
  const n = (t.match(/<loc>/g) || []).length;
  assert.equal(n, 4 + GROUPS.length * (REGIONS.length + 1) + REGIONS.length);
  assert.ok(t.includes('<loc>https://local.bizhelp.kr/baegwan-nusu/jungang-dong</loc>'));
});

test('no phone: 견적 받기 mode with per-work deep links, no service name on screen', async () => {
  // 발급 링크(shared/soomgo-deeplinks.json, 사이트 A100709867)가 LINKPRICE_SITE 보다 우선한다
  const e = { D1: makeD1(), LINKPRICE_SITE: 'A100000001' };
  const h = await (await get(e, '/dobae-jangpan/buldang-1-dong')).text();
  assert.ok(h.includes('체크하고 견적 받기') && !h.includes('href="sms:'));
  assert.ok(h.includes('https://lpweb.kr/click.php?m=soomgo&amp;a=A100709867'));
  assert.ok(!h.includes('A100000001'));
  assert.ok(h.includes(encodeURIComponent('https://soomgo.com/hire/장판-시공')));
  assert.ok(h.includes('rel="sponsored noopener"') && h.includes('수수료'));
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  assert.ok(!/숨고|고수/.test(text));
  // 발급분이 없는 항목: 사이트 코드가 있으면 같은 형식으로 만들고, 없으면 빈 값(상담 칸 숨김)
  assert.match(deepLink('A100000001', '없는-항목'), /a=A100000001/);
  assert.equal(deepLink('', '없는-항목'), '');
  // 번호를 넣으면 문자 모드
  const sms = await (await get({ D1: makeD1(), CONSULT_PHONE: '010-1234-5678' }, '/dobae-jangpan/buldang-1-dong')).text();
  assert.ok(sms.includes('체크하고 문자 보내기') && sms.includes('href="tel:01012345678"'));
  const closest = await (await get(e, '/gyedan-suri/sinbang-dong')).text();
  assert.ok(closest.includes('가장 가까운'));
});

test('lead: validates against group values, records, rejects junk', async () => {
  const v = validateLead({ g: 'baegwan-nusu', r: 'sinbang-dong', work: ['누수 탐지', '해킹'], symptom: ['천장 물 얼룩'], area: ['신방동', 'http://x.com'], src: 'naver' });
  assert.deepEqual(v.work, ['누수 탐지']);
  assert.deepEqual(v.area, ['신방동']);
  assert.equal(validateLead({ g: 'x', r: 'sinbang-dong' }), null);
  const e = env();
  const post = (body) => worker.fetch(new Request('https://local.bizhelp.kr/api/lead', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), e);
  assert.equal((await post({ g: 'baegwan-nusu', r: 'sinbang-dong', work: ['누수 탐지'] })).status, 204);
  assert.equal((await post({ g: 'baegwan-nusu', r: 'nowhere' })).status, 400);
  const row = e.D1.db.prepare('SELECT * FROM kw_leads').get();
  assert.equal(row.group_slug, 'baegwan-nusu');
  assert.equal(row.src, 'direct');
});
