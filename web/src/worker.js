import { page, cleanSrc } from './html.js';
import { home } from './pages/home.js';
import { dong } from './pages/dong.js';
import { start } from './pages/start.js';
import { claimVerify, claimConfirm } from './lib/claim.js';

const notFound = () => page({
  title: '페이지를 찾을 수 없어요', desc: '', status: 404, noindex: true,
  body: '<h1>페이지를 찾을 수 없어요</h1><p class="lead">주소를 다시 확인해 주세요.</p><a class="btn" href="/">처음으로</a>',
});

// Route table: [regex, handler(env, match, src)]. Handler returns Response or null (-> 404). Later tasks append rows.
const ROUTES = [
  [/^\/start\/?$/, (env) => start(env)],
  [/^\/api\/claim\/verify$/, (env, m, src, req) => claimVerify(req, env)],
  [/^\/api\/claim\/confirm$/, (env, m, src, req) => claimConfirm(req, env)],
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
  async scheduled(event, env, ctx) {} // Task 7 fills it
};
