import { esc } from '../html.js';

// Returns an escaped HTML fragment (Task 6 extends this same function into the public page).
// row: { content: object|json string, areas: array|json string }
export function renderLanding(row, opts = {}) {
  const parse = (v, d) => { if (typeof v !== 'string') return v ?? d; try { return JSON.parse(v); } catch { return d; } };
  const c = parse(row.content, {});
  const areas = parse(row.areas, []);
  const li = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const parts = [];
  parts.push(`<h1>${esc(c.name || '가게 이름')}</h1>`);
  if (c.tagline) parts.push(`<p class="lead">${esc(c.tagline)}</p>`);
  if (c.intro) parts.push(`<p>${esc(c.intro)}</p>`);
  for (const k of c.photos ?? []) if (/^landings\/[\w-]+\/[\w-]+\.(jpg|png|webp)$/.test(k)) parts.push(`<img src="/media/${esc(k)}" alt="" style="max-width:100%;border-radius:12px">`);
  if (c.services?.length) parts.push(`<h2>하는 일</h2>${li(c.services.map((x) => `<b>${esc(x.title)}</b> ${esc(x.detail)}`))}`);
  if (c.excludes?.length) parts.push(`<h2>하지 않는 일</h2>${li(c.excludes.map(esc))}`);
  if (c.extraCosts?.length) parts.push(`<h2>추가 비용이 생기는 경우</h2>${li(c.extraCosts.map((x) => `<b>${esc(x.when)}</b> ${esc(x.note)}`))}`);
  if (areas.length) parts.push(`<h2>출장 동네</h2><p>${areas.map(esc).join(', ')}</p>`);
  if (c.hours) parts.push(`<h2>영업시간</h2><p>${esc(c.hours)}</p>`);
  if (c.phone) parts.push(`<h2>연락처</h2><p>${esc(c.phone)}</p>`);
  const ch = Object.entries(c.channels ?? {}).filter(([, u]) => /^https:\/\//.test(u));
  if (ch.length) parts.push(`<h2>채널</h2>${li(ch.map(([k, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(k)}</a>`))}`);
  return parts.join('');
}
