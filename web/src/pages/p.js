import { page, esc } from '../html.js';
import { publishedLandingBySlug } from '../db.js';
import { renderLanding, PHOTO_RE } from './landing.js';
import { normalizeSrc } from '../lib/src.js';

const ORIGIN = 'https://local.bizhelp.kr';

export async function publicLanding(env, slug, src) {
  const row = await publishedLandingBySlug(env, slug);
  if (!row) return null;
  let c = {};
  try { c = JSON.parse(row.content || '{}') ?? {}; } catch { /* bad content json: render name only */ }
  if (typeof c !== 'object' || Array.isArray(c)) c = {};
  const name = row.name || c.name || '가게';
  const desc = c.tagline || c.intro || `${name} 소개예요.`;
  const photo = (Array.isArray(c.photos) ? c.photos : []).find((k) => typeof k === 'string' && PHOTO_RE.test(k));
  const url = `${ORIGIN}/p/${row.slug}`;
  const head = `<meta property="og:type" content="website"><meta property="og:title" content="${esc(name)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">${photo ? `<meta property="og:image" content="${esc(`${ORIGIN}/media/${photo}`)}">` : ''}\n`;
  return page({ title: `${name} | 로컬브릿지AI_천안`, desc, canonical: url, head, body: renderLanding(row, { public: true, src: normalizeSrc(src) }) });
}

// Always 204: never slows or blocks the call; records only for published landings, rate-limited per IP.
export async function callClick(req, env) {
  const none = new Response(null, { status: 204 });
  if (req.method !== 'POST') return none;
  try {
    if (env.LIMIT && !(await env.LIMIT.limit({ key: `c:${req.headers.get('cf-connecting-ip') || 'local'}` })).success) return none;
    const b = await req.json().catch(() => null);
    if (!b || typeof b.slug !== 'string') return none;
    await env.D1.prepare(`INSERT INTO call_clicks (landing_id, src) SELECT id, ? FROM landings WHERE slug = ? AND status = 'published'`)
      .bind(normalizeSrc(b.src), b.slug.slice(0, 80)).run();
  } catch { /* tracking must never break the call */ }
  return none;
}
