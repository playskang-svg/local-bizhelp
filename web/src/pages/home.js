import { page, esc, withSrc } from '../html.js';
import { listDongs } from '../db.js';

export async function home(env, src) {
  const dongs = await listDongs(env);
  const links = dongs.map((d) => `<li><a href="${esc(withSrc(`/d/${d.slug}`, src))}">${esc(d.name)}</a></li>`).join('');
  return page({
    title: '로컬브릿지AI_천안', desc: '천안 우리 동네 이사·청소·설치·집수리 업체를 찾아봐요.', noindex: true,
    body: `<h1>우리 동네 생활 업체를 찾아봐요</h1><p class="lead">동네를 고르면 이사·청소·설치·집수리 업체를 볼 수 있어요.</p><ul class="chips">${links}</ul>`,
  });
}
