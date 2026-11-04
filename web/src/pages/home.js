import { page, esc, withSrc } from '../html.js';
import { listDongs } from '../db.js';

const GU = [['dongnam', '동남구'], ['seobuk', '서북구']];

export async function home(env, src) {
  const dongs = await listDongs(env);
  const groups = GU.map(([gu, label]) => {
    const links = dongs.filter((d) => d.gu === gu)
      .map((d) => `<li><a href="${esc(withSrc(`/d/${d.slug}`, src))}">${esc(d.name)}</a></li>`).join('');
    return links ? `<section class="panel"><h2>${label}</h2><ul class="chips">${links}</ul></section>` : '';
  }).join('');
  return page({
    title: '로컬브릿지AI_천안', desc: '천안 우리 동네 이사·청소·설치·집수리 업체를 찾아봐요.', noindex: true,
    body: `<h1>지역 골목상권 생활 밀착형 연계 플랫폼</h1><p class="lead">동네를 고르면 이사·청소·설치·집수리 업체를 볼 수 있어요.</p>
<p><a class="btn" href="${esc(withSrc('/start', src))}">내 가게 등록하기</a></p>${groups}`,
  });
}
