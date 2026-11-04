import { page, cleanSrc, esc } from './html.js';
import { home } from './pages/home.js';
import { privacy } from './pages/privacy.js';

import { dong } from './pages/dong.js';
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

const ROBOTS = ['User-agent: *', 'Allow: /', ...['/edit', '/ack/', '/api/', '/admin', '/cms-api'].map((p) => `Disallow: ${p}`), 'Sitemap: https://local.bizhelp.kr/sitemap.xml', ''].join('\n');

// Route table: [regex, handler(env, match, src)]. Handler returns Response or null (-> 404). Later tasks append rows.
const ROUTES = [
  [/^\/start\/?$/, (env) => start(env)],
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
  [/^\/robots\.txt$/, () => new Response(ROBOTS, { headers: { 'content-type': 'text/plain; charset=utf-8' } })],
  [/^\/sitemap\.xml$/, async (env) => {
    const rows = (await env.D1.prepare("SELECT slug, updated_at FROM landings WHERE status = 'published' ORDER BY id").all()).results;
    const urls = rows.map((r) => `<url><loc>https://local.bizhelp.kr/p/${esc(r.slug)}</loc><lastmod>${esc(r.updated_at)}</lastmod></url>`).join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  }],
  [/^\/$/, (env, m, src) => home(env, src)],
  [/^\/d\/([a-z0-9-]+)\/?$/, (env, m, src) => dong(env, m[1], null, src)],
  [/^\/d\/([a-z0-9-]+)\/([a-z]+)\/?$/, (env, m, src) => dong(env, m[1], m[2], src)],
];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const src = cleanSrc(url.searchParams.get('src'));
    for (const [re, fn] of ROUTES) {
      const m = url.pathname.match(re);
      if (m) return (await fn(env, m, src, req)) ?? notFound();
    }
    return notFound();
  },
  async scheduled(event, env, ctx) { await runCron(env); }
};
