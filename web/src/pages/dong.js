import { page, esc, withSrc } from '../html.js';
import { getDong, publishedLandingsIn } from '../db.js';

export const TRADES = { move: '이사', clean: '청소', install: '설치', repair: '집수리' };

function cardOf(l, src) {
  let headline = '';
  try { headline = JSON.parse(l.content || '{}').headline || ''; } catch { /* bad content json: show name only */ }
  return `<a class="card" style="text-decoration:none" href="${esc(withSrc(`/l/${l.slug}`, src))}"><h2>${esc(l.name)}</h2>${headline ? `<p>${esc(headline)}</p>` : ''}</a>`;
}

export async function dong(env, slug, trade, src) {
  const d = await getDong(env, slug);
  if (!d || (trade && !TRADES[trade])) return null;
  const rows = await publishedLandingsIn(env, slug, trade);
  const start = withSrc('/start', src);
  const empty = `<div class="card"><p>아직 등록한 업체가 없어요.</p><a class="btn" href="${esc(start)}">업체 등록하기</a></div>`;
  const tradeCard = ([t, label]) => {
    const own = rows.filter((r) => r.trade === t);
    return `<section class="panel"><h2>${label}</h2>${own.length ? `<div class="grid">${own.map((r) => cardOf(r, src)).join('')}</div>` : empty}</section>`;
  };
  const body = trade
    ? `<h1>${esc(d.name)} ${TRADES[trade]}</h1><p class="lead">${esc(d.name)}에서 ${TRADES[trade]} 일을 하는 업체예요.</p>${tradeCard([trade, TRADES[trade]])}<p><a class="btn ghost" href="${esc(withSrc(`/d/${slug}`, src))}">${esc(d.name)} 전체 보기</a></p>`
    : `<h1>${esc(d.name)} 생활 업체</h1><p class="lead">${esc(d.name)}에서 일하는 이사·청소·설치·집수리 업체예요.</p>${Object.entries(TRADES).map(tradeCard).join('')}`;
  return page({
    title: `${d.name}${trade ? ' ' + TRADES[trade] : ''} 업체 | 로컬브릿지AI_천안`,
    desc: `${d.name}에서 ${trade ? TRADES[trade] : '이사·청소·설치·집수리'} 업체를 찾아봐요.`, body, noindex: true,
  });
}
