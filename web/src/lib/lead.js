// POST /api/lead — 키워드 페이지에서 '문자로 보내기'를 누른 기록(문의 수·경로별 유입 측정용).
// 문자 자체는 방문자 휴대폰의 문자 앱에서 나가므로 여기서는 고른 항목만 남긴다. 전화번호·이름은 받지 않는다.
import { groupOf, regionOf } from '../kw/data.js';
import { normalizeSrc } from './src.js';

const LINKY = /http|www\.|[a-z0-9-]+\.[a-z]{2,}/i;
const list = (v, allowed, max = 10) => (Array.isArray(v) ? v : [])
  .filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, 30))
  .filter((x) => x && !LINKY.test(x) && (!allowed || allowed.includes(x))).slice(0, max);

export function validateLead(b) {
  if (!b || typeof b !== 'object') return null;
  const g = groupOf(String(b.g ?? '')), r = regionOf(String(b.r ?? ''));
  if (!g || !r) return null;
  return {
    group: g.slug, region: r.slug,
    work: list(b.work, [...g.subs, '잘 모르겠어요']),
    symptom: list(b.symptom, [...(g.content.symptoms || []), '기타']),
    area: list(b.area, null, 7),
    src: normalizeSrc(b.src),
  };
}

export async function submitLead(req, env, now = Date.now()) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  if (env.LIMIT && !(await env.LIMIT.limit({ key: `l:${req.headers.get('cf-connecting-ip') || 'local'}` })).success) return new Response(null, { status: 429 });
  const v = validateLead(await req.json().catch(() => null));
  if (!v) return new Response(null, { status: 400 });
  await env.D1.prepare('INSERT INTO kw_leads (created_at, group_slug, region_slug, work, symptom, area, src) VALUES (?,?,?,?,?,?,?)')
    .bind(new Date(now).toISOString(), v.group, v.region, JSON.stringify(v.work), JSON.stringify(v.symptom), JSON.stringify(v.area), v.src).run();
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
