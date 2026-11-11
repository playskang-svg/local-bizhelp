// suriwiki 관리센터(admin.suriwiki.com)에서 키워드 그룹과 전/후 사진을 가져온다.
//  - shared/keyword-groups.json : 그룹(키워드·서브키워드·템플릿·내용)
//  - web/public/ba/<slug>/<id>-before.webp, -after.webp : 전/후 사진 (내용 해시로 중복 제거)
//  - shared/ba-photos.json : { <slug>: [id, ...] }
//  - suriwiki 저장소의 bizhelp/site-images/<slug>/* 도 web/public/img/<slug>/ 로 복사한다(있을 때만)
// 다시 돌려도 같은 결과가 나온다(이미 받은 파일은 건너뜀).
// 사용: node scripts/import-suriwiki.mjs [--rsuri C:/Window_DEV/github/rsuri]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const O = 'https://admin.suriwiki.com';
const arg = process.argv.indexOf('--rsuri');
const RSURI = arg > 0 ? process.argv[arg + 1] : 'C:/Window_DEV/github/rsuri';

const getJson = async (p) => { const r = await fetch(O + p); if (!r.ok) throw new Error(`${p} ${r.status}`); return r.json(); };

const groupsRaw = await getJson('/api/export/groups');
const groups = (groupsRaw.groups || groupsRaw).map((x) => ({
  slug: x.slug, keyword: x.main_keyword, subs: x.subs, template: x.template || 'consult',
  content: { headline: x.content?.headline || '', lead: x.content?.lead || '', symptoms: x.content?.symptoms || [], guide: x.content?.guide || {} },
}));
const sharedDir = path.join(ROOT, 'shared');
const keep = fs.existsSync(path.join(sharedDir, 'keyword-groups.json')) ? JSON.parse(fs.readFileSync(path.join(sharedDir, 'keyword-groups.json'), 'utf8')) : [];
// 로컬에서 보강한 내용(content)이 있으면 지우지 않는다 — 원격 값이 비어 있을 때만 로컬 값을 쓴다
for (const g of groups) {
  const old = keep.find((k) => k.slug === g.slug);
  if (old && !g.content.symptoms.length) g.content = old.content;
  // 리서치해서 넣은 검색어·질문은 suriwiki에 없는 로컬 값이다 — 다시 가져와도 지우지 않는다
  if (old?.longtail) g.longtail = old.longtail;
  if (old?.faq) g.faq = old.faq;
}
fs.writeFileSync(path.join(sharedDir, 'keyword-groups.json'), JSON.stringify(groups, null, 1) + '\n');

const { items } = await getJson('/api/export/ba');
const pairs = new Map(); // `${slug}|${region}|${slot}` -> {before, after}
for (const i of items) {
  const k = `${i.slug}|${i.region}|${i.slot}`;
  const p = pairs.get(k) || {};
  p[i.phase] = i;
  pairs.set(k, p);
}
const out = {};
const seen = new Set();
let n = 0;
for (const [k, p] of pairs) {
  if (!p.before || !p.after) continue;
  const [slug, region, slot] = k.split('|');
  const fetchOne = async (phase) => {
    const r = await fetch(`${O}/api/s/${slug}/ba/${region ? region + '/' : ''}${slot}/${phase}`);
    if (!r.ok) throw new Error(`${k} ${phase} ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  };
  const dir = path.join(ROOT, 'web/public/ba', slug);
  fs.mkdirSync(dir, { recursive: true });
  const b = await fetchOne('before'), a = await fetchOne('after');
  const id = crypto.createHash('sha1').update(b).update(a).digest('hex').slice(0, 10);
  if (seen.has(`${slug}|${id}`)) continue; // 같은 사진 쌍을 여러 지역에 올린 경우
  seen.add(`${slug}|${id}`);
  fs.writeFileSync(path.join(dir, `${id}-before.webp`), b);
  fs.writeFileSync(path.join(dir, `${id}-after.webp`), a);
  (out[slug] ||= []).push(id);
  if (++n % 50 === 0) console.log(n, 'pairs');
}
for (const s of Object.keys(out)) out[s].sort();
fs.writeFileSync(path.join(sharedDir, 'ba-photos.json'), JSON.stringify(out, null, 1) + '\n');

const siteImgs = path.join(RSURI, 'bizhelp/site-images');
if (fs.existsSync(siteImgs)) {
  for (const slug of fs.readdirSync(siteImgs)) {
    const to = path.join(ROOT, 'web/public/img', slug);
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(path.join(siteImgs, slug))) fs.copyFileSync(path.join(siteImgs, slug, f), path.join(to, f));
  }
}
// 화면이 있는 사진만 쓰도록 파일 목록을 남긴다
const imgRoot = path.join(ROOT, 'web/public/img');
const listing = fs.existsSync(imgRoot) ? Object.fromEntries(fs.readdirSync(imgRoot).map((s) => [s, fs.readdirSync(path.join(imgRoot, s)).sort()])) : {};
fs.writeFileSync(path.join(sharedDir, 'site-images.json'), JSON.stringify(listing, null, 1) + '\n');
console.log('groups', groups.length, 'unique pairs', n, Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
