import test from 'node:test';
import assert from 'node:assert/strict';
import { makeD1 } from './helpers/d1.js';
import { renderLanding } from '../src/pages/landing.js';
import worker from '../src/worker.js';

test('owner text is escaped', () => assert.ok(!renderLanding({ content: { intro: '<script>x</script>' }, areas: [] }, {}).includes('<script>x')));

async function setup(status, content = { tagline: '친절해요', phone: '010-1234-5678', photos: ['landings/1/a.jpg'], address: '충남 천안시 동남구 1' }) {
  const D1 = makeD1();
  D1.db.exec("INSERT INTO dongs (slug,name,gu) VALUES ('dongnam-mokcheon-eup','목천읍','dongnam')");
  D1.db.exec("INSERT INTO businesses (id,name,trade,dong_id,source,claimed) VALUES (1,'테스트청소','clean',1,'self',1)");
  D1.db.prepare("INSERT INTO landings (business_id,slug,status,content,areas) VALUES (1,'s1',?,?,'[\"dongnam-mokcheon-eup\"]')").run(status, JSON.stringify(content));
  return { D1 };
}
const get = (env, path) => worker.fetch(new Request('https://local.bizhelp.kr' + path), env);
const call = (env, body) => worker.fetch(new Request('https://local.bizhelp.kr/api/call', { method: 'POST', body: JSON.stringify(body) }), env);
const clicks = (D1) => D1.db.prepare('SELECT * FROM call_clicks').all();

test('/p/:slug 404 for draft, held, missing; 200 published', async () => {
  for (const s of ['draft', 'held']) assert.equal((await get(await setup(s), '/p/s1')).status, 404);
  const env = await setup('published');
  assert.equal((await get(env, '/p/nope')).status, 404);
  const r = await get(env, '/p/s1?src=abc');
  assert.equal(r.status, 200);
  assert.ok(!r.headers.get('x-robots-tag'));
  const h = await r.text();
  assert.ok(!h.includes('name="robots"'));
  assert.match(h, /rel="canonical" href="https:\/\/local\.bizhelp\.kr\/p\/s1"/);
  assert.match(h, /og:title/);
  assert.match(h, /property="og:image" content="https:\/\/local\.bizhelp\.kr\/media\/landings\/1\/a\.jpg"/);
  assert.match(h, /href="tel:01012345678"/);
  assert.match(h, /name="hp"/);
  assert.ok(h.includes('테스트청소') && h.includes('목천읍'));
});

test('no og:image without photo', async () => {
  const h = await (await get(await setup('published', { tagline: 'x' }), '/p/s1')).text();
  assert.ok(!h.includes('og:image'));
});

test('/api/call inserts for published only, 204 always', async () => {
  const pub = await setup('published');
  assert.equal((await call(pub, { slug: 's1', src: 'isa-1' })).status, 204);
  assert.equal((await call(pub, { slug: 's1', src: '<x>' })).status, 204);
  const rows = clicks(pub.D1);
  assert.deepEqual(rows.map((r) => r.src), ['isa-1', 'direct']);
  const dr = await setup('draft');
  assert.equal((await call(dr, { slug: 's1', src: 'a' })).status, 204);
  assert.equal(clicks(dr.D1).length, 0);
  assert.equal((await call(pub, 'garbage')).status, 204);
});

test('길찾기 from business address; hidden without', async () => {
  const a = await setup('published', { tagline: 'x', phone: '01012345678' });
  a.D1.db.exec("UPDATE businesses SET address='천안시 동남구 1'");
  assert.ok((await (await get(a, '/p/s1')).text()).includes('map.naver.com/p/search/' + encodeURIComponent('천안시 동남구 1')));
  const b = await setup('published', { tagline: 'x', phone: '01012345678' });
  assert.ok(!(await (await get(b, '/p/s1')).text()).includes('길찾기'));
});
test('form posts, never GET', async () => {
  assert.match(await (await get(await setup('published'), '/p/s1')).text(), /<form[^>]*method="post"/);
});
test('bad stored content does not 500', async () => {
  for (const c of ['{"photos":"x"}', 'null']) {
    const env = await setup('published');
    env.D1.db.prepare('UPDATE landings SET content=?').run(c);
    assert.equal((await get(env, '/p/s1')).status, 200);
  }
});
test('public page escapes name; non-https channel dropped; call 204 any method', async () => {
  const env = await setup('published', { tagline: 'x', channels: { blog: 'http://a.example', kakao: 'https://k.example' } });
  env.D1.db.exec(`UPDATE businesses SET name='a"b<i>'`);
  const h = await (await get(env, '/p/s1')).text();
  assert.ok(!h.includes('a"b<i>') && h.includes('a&quot;b&lt;i&gt;'));
  assert.match(h, /og:title" content="a&quot;b&lt;i&gt;"/);
  assert.ok(!h.includes('http://a.example') && h.includes('https://k.example'));
  assert.equal((await worker.fetch(new Request('https://x/api/call'), env)).status, 204);
});
