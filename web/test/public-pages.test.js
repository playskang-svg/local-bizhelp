import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeD1 } from './helpers/d1.js';
import worker from '../src/worker.js';

const dongs = JSON.parse(fs.readFileSync(new URL('../../shared/dongs.json', import.meta.url), 'utf8'));
const get = (env, path) => worker.fetch(new Request('https://local.bizhelp.kr' + path), env);

function setup() {
  const D1 = makeD1();
  const ins = D1.db.prepare('INSERT INTO dongs (slug,name,gu) VALUES (?,?,?)');
  for (const d of dongs) ins.run(d.slug, d.name, d.gu);
  D1.db.exec("INSERT INTO businesses (id,name,trade,dong_id,source,claimed) VALUES (1,'가게',  'clean',1,'self',1)");
  const l = D1.db.prepare("INSERT INTO landings (business_id,slug,status,content,areas,updated_at) VALUES (1,?,?,'{}','[]',?)");
  l.run('pub-1', 'published', '2026-11-05T01:02:03.000Z');
  l.run('draft-1', 'draft', '2026-11-05T01:02:03.000Z');
  l.run('a&b', 'published', '2026-11-04T00:00:00.000Z');
  return { D1 };
}

test('/privacy names officer, processors, retention', async () => {
  const r = await get(setup(), '/privacy');
  assert.equal(r.status, 200);
  const h = await r.text();
  for (const s of ['박서희', 'cosmos0302@kakao.com', '팝빌', 'Anthropic', 'Cloudflare', '국세청', '비즈헬프', '2026-11-05', '1년']) assert.ok(h.includes(s), s);
});

test('/robots.txt', async () => {
  const r = await get(setup(), '/robots.txt');
  assert.match(r.headers.get('content-type'), /text\/plain/);
  const t = await r.text();
  assert.match(t, /^User-agent: \*\nAllow: \/$/m);
  for (const p of ['/edit', '/ack/', '/api/', '/admin', '/cms-api']) assert.ok(t.includes(`Disallow: ${p}\n`), p);
  assert.ok(t.includes('Sitemap: https://local.bizhelp.kr/sitemap.xml'));
});

test('/sitemap.xml lists published only, escaped', async () => {
  const r = await get(setup(), '/sitemap.xml');
  assert.match(r.headers.get('content-type'), /xml/);
  const t = await r.text();
  assert.ok(t.includes('<loc>https://local.bizhelp.kr/p/pub-1</loc>'));
  assert.ok(t.includes('<lastmod>2026-11-05T01:02:03.000Z</lastmod>'));
  assert.ok(t.includes('/p/a&amp;b'));
  assert.ok(!t.includes('draft-1'));
});

test('home links /start and every dong', async () => {
  const h = await (await get(setup(), '/')).text();
  assert.ok(h.includes('href="/start"'));
  assert.ok(h.includes('지역 골목상권 생활 밀착형 연계 플랫폼'));
  assert.ok(h.includes('동남구') && h.includes('서북구'));
  assert.ok(!h.includes('곧 시작'));
  for (const d of dongs) assert.ok(h.includes(`href="/d/${d.slug}"`), d.slug);
});

test('home is indexable and in sitemap', async () => {
  const env = setup();
  const r = await get(env, '/');
  assert.ok(!r.headers.get('x-robots-tag'));
  assert.ok(!(await r.text()).includes('noindex'));
  const t = await (await get(env, '/sitemap.xml')).text();
  assert.ok(t.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://local.bizhelp.kr/</loc></url>'));
});

test('/privacy lists every collected field', async () => {
  const h = await (await get(setup(), '/privacy')).text();
  for (const s of ['사업자등록번호', '대표자 성명', '개업일자', '상호', '휴대폰', '사진', '소개', '게임·홍보에 가게 이름 노출 동의', '동네', '작업 내용', '희망 날짜', '연락 동의', '유입 경로']) assert.ok(h.includes(s), s);
});

test('http redirects to https (301) except localhost', async () => {
  const env = setup();
  const r = await worker.fetch(new Request('http://local.bizhelp.kr/p/x?src=a'), env);
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://local.bizhelp.kr/p/x?src=a');
  assert.equal((await worker.fetch(new Request('http://localhost:8787/robots.txt'), env)).status, 200);
  assert.equal((await worker.fetch(new Request('http://127.0.0.1:8787/robots.txt'), env)).status, 200);
});

test('/start links to the relink screen', async () => {
  const h = await (await get(setup(), '/start')).text();
  assert.match(h, /<a href="\/edit">수정 주소를 잃어버리셨나요\? 다시 받기<\/a>/);
});
