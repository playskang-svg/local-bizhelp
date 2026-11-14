import { page, cleanSrc, esc, ORIGIN } from './html.js';
import { home, main } from './pages/home.js';
import { regionPage, hubPage, areaPage, allPaths } from './kw/render.js';
import { groupOf, regionOf } from './kw/data.js';
import { kwShops } from './kw/shops.js';
import { submitLead } from './lib/lead.js';
import { privacy } from './pages/privacy.js';
import { guidePage, GUIDE_PATHS } from './pages/guide.js';
import { dong } from './pages/dong.js';
import { loginPage } from './pages/login.js';
import { authOn, getSession, authStart, authCallback, logout } from './lib/auth.js';
import { start } from './pages/start.js';
import { claimVerify, claimConfirm } from './lib/claim.js';
import { editPage } from './pages/edit.js';
import { publicLanding, callClick } from './pages/p.js';
import { submitInquiry, runCron, ackPost } from './lib/inquiry.js';
import { ackPage } from './pages/ack.js';
import { landingState, landingChat, landingPublish, landingPhoto, editLink, mediaGet } from './lib/landing-api.js';

const notFound = () => page({
  title: '페이지를 찾을 수 없어요', desc: '', status: 404, noindex: true,
  body: '<h1>페이지를 찾을 수 없어요</h1><p class="lead">주소를 다시 확인해 주세요.</p><a class="btn" href="/">처음으로</a>',
});

const ROBOTS = ['User-agent: *', 'Allow: /', ...['/edit', '/ack/', '/api/', '/auth/', '/login', '/logout', '/admin', '/cms-api', '/go'].map((p) => `Disallow: ${p}`), 'Sitemap: https://local.bizhelp.kr/sitemap.xml', ''].join('\n');

// Route table: [regex, handler(env, match, src)]. Handler returns Response or null (-> 404). Later tasks append rows.
const ROUTES = [
  [/^\/login\/?$/, (env, m, src, req) => loginPage(env, req)],
  [/^\/auth\/(google|naver)\/?$/, (env, m) => authStart(env, m[1])],
  [/^\/auth\/(google|naver)\/callback$/, (env, m, src, req) => authCallback(req, env, m[1])],
  [/^\/logout$/, () => logout()],
  // 로그인 키가 설정된 뒤에만 등록 화면을 로그인으로 막는다(미설정이면 기존 휴대폰 인증 등록 그대로)
  [/^\/start\/?$/, async (env, m, src, req) => (authOn(env) && !(await getSession(req, env)) ? Response.redirect(`${ORIGIN}/login`, 302) : start(env, req))],
  [/^\/api\/claim\/verify$/, (env, m, src, req) => claimVerify(req, env)],
  [/^\/api\/claim\/confirm$/, (env, m, src, req) => claimConfirm(req, env)],
  [/^\/edit\/?$/, () => editPage()],
  [/^\/p\/([a-z0-9-]+)\/?$/, (env, m, src) => publicLanding(env, m[1], src)],
  [/^\/api\/call$/, (env, m, src, req) => callClick(req, env)],
  [/^\/api\/inquiry$/, (env, m, src, req) => submitInquiry(req, env)],
  [/^\/api\/ack$/, (env, m, src, req) => ackPost(req, env)],
  [/^\/ack\/([A-Za-z0-9_-]{1,64})\/?$/, (env, m) => ackPage(env, m[1])],
  [/^\/api\/landing\/state$/, (env, m, src, req) => landingState(req, env)],
  [/^\/api\/landing\/chat$/, (env, m, src, req) => landingChat(req, env)],
  [/^\/api\/landing\/photo$/, (env, m, src, req) => landingPhoto(req, env)],
  [/^\/api\/landing\/publish$/, (env, m, src, req) => landingPublish(req, env)],
  [/^\/api\/edit-link$/, (env, m, src, req) => editLink(req, env)],
  [/^\/media\/(landings\/\d+\/[\w-]+\.(?:jpg|png|webp))$/, (env, m) => mediaGet(env, m[1])],
  [/^\/privacy\/?$/, () => privacy()],
  [/^\/guide\/([a-z0-9-]+)\/?$/, (env, m) => guidePage(m[1])],
  [/^\/robots\.txt$/, () => new Response(ROBOTS, { headers: { 'content-type': 'text/plain; charset=utf-8' } })],
  [/^\/sitemap\.xml$/, async (env) => {
    const rows = (await env.D1.prepare("SELECT slug, updated_at FROM landings WHERE status = 'published' ORDER BY id").all()).results;
    const loc = (p, lastmod) => `<url><loc>${ORIGIN}${esc(p)}</loc>${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : ''}</url>`;
    const urls = loc('/') + [...GUIDE_PATHS, ...allPaths()].map((p) => loc(p)).join('') + rows.map((r) => loc(`/p/${r.slug}`, r.updated_at)).join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  }],
  [/^\/api\/lead$/, (env, m, src, req) => submitLead(req, env)],
  // 검색창(자바스크립트 없이 제출한 경우)
  [/^\/go$/, (env, m, src, req) => {
    const q = new URL(req.url).searchParams;
    const g = groupOf(q.get('k') || ''), r = regionOf(q.get('r') || '');
    return g ? Response.redirect(`${ORIGIN}/${g.slug}${r ? `/${r.slug}` : ''}`, 302) : Response.redirect(`${ORIGIN}/cheonan`, 302);
  }],
  [/^\/area\/([a-z0-9-]+)\/?$/, async (env, m, src) => { const r = regionOf(m[1]); return r ? areaPage(env, r, src, await kwShops(env, r)) : null; }],
  [/^\/$/, (env, m, src) => main(env, src)],
  [/^\/cheonan\/?$/, (env, m, src) => home(env, src)],
  [/^\/d\/([a-z0-9-]+)\/?$/, (env, m, src) => dong(env, m[1], null, src)],
  [/^\/d\/([a-z0-9-]+)\/([a-z]+)\/?$/, (env, m, src) => dong(env, m[1], m[2], src)],
  // 키워드 허브와 키워드 × 지역 페이지 — 위 고정 경로와 겹치지 않는 슬러그만 그룹으로 인정된다
  [/^\/([a-z0-9-]+)\/?$/, (env, m, src) => { const g = groupOf(m[1]); return g ? hubPage(env, g, src) : null; }],
  [/^\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/, async (env, m, src) => {
    const g = groupOf(m[1]), r = regionOf(m[2]);
    return g && r ? regionPage(env, g, r, src, await kwShops(env, r)) : null;
  }],
];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      url.protocol = 'https:';
      return Response.redirect(url.href, 301);
    }
    const src = cleanSrc(url.searchParams.get('src'));
    for (const [re, fn] of ROUTES) {
      const m = url.pathname.match(re);
      if (m) return (await fn(env, m, src, req)) ?? notFound();
    }
    return notFound();
  },
  async scheduled(event, env, ctx) { await runCron(env); }
};
