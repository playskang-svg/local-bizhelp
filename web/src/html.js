const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
export const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

export const cleanSrc = (v) => (/^[a-z0-9-]{1,40}$/.test(v ?? '') ? v : '');
export const withSrc = (path, src) => (src ? `${path}?src=${src}` : path);

export const ORIGIN = 'https://local.bizhelp.kr';
export const SITE = '로컬브릿지AI_천안';
export const BRAND = '로컬브릿지';
export const CITY = '/cheonan';
// 검색엔진 소유확인(구글·네이버·빙) + GA4 + Clarity (2026-11-13 등록). noindex 관리 페이지에는 추적 스크립트를 넣지 않는다.
const SEO_META = '<meta name="google-site-verification" content="ebbsPBVf8YPzzbfOeK6E3tkf5au44bfbmEaxtvdBU90"><meta name="naver-site-verification" content="c3c180a5f8873cceab812c36730d4049353e9ebd"><meta name="msvalidate.01" content="86415BFFA0E8468FBD1D2BF2EEAB94C2">';
const TRACKING = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-65CJ56JCNM"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-65CJ56JCNM");</script><script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","zcud7fiivi");</script>';

// 디자인: 흰 바탕 + 쿨 그레이 + 강조색 하나(페이지마다 --ac 로 바꾼다). 휴대폰 360px 기준, 가로 넘침 없음.
const CSS = `:root{--bg:#fff;--soft:#f4f6f9;--line:#e4e8ee;--ink:#0f1728;--sub:#5a667a;--ac:#2457d6;--ac-soft:color-mix(in srgb,var(--ac) 9%,#fff);--r:16px;--sh:0 1px 2px rgba(16,24,40,.05),0 8px 24px rgba(16,24,40,.07)}
*{box-sizing:border-box;margin:0;padding:0}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:72px}
body{background:var(--bg);color:var(--ink);font:17px/1.75 "Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;letter-spacing:-.01em;word-break:keep-all;overflow-wrap:anywhere;overflow-x:hidden}
a{color:inherit;text-decoration:none}img{max-width:100%;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}.narrow{max-width:760px}
.site-h{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.6) blur(10px);border-bottom:1px solid var(--line)}
.site-h .wrap{display:flex;align-items:center;gap:16px;height:60px}
.logo{display:flex;flex-direction:column;line-height:1.15;font-weight:800;font-size:17px;letter-spacing:-.03em}.logo small{font-size:11px;font-weight:600;color:var(--sub);letter-spacing:0}
.nav{display:flex;gap:4px;margin-left:auto}.nav a{font-size:15px;font-weight:600;color:var(--sub);padding:8px 12px;border-radius:10px}.nav a:hover{background:var(--soft);color:var(--ink)}
.nav .cta{background:var(--ink);color:#fff}.nav .cta:hover{background:var(--ac);color:#fff}
@media(max-width:720px){.nav a:not(.cta){display:none}}
h1{font-size:clamp(28px,6.4vw,46px);line-height:1.22;letter-spacing:-.035em;font-weight:800}
h2{font-size:clamp(23px,4.4vw,30px);line-height:1.3;letter-spacing:-.03em;font-weight:800}
h3{font-size:18px;line-height:1.4;letter-spacing:-.02em;font-weight:700}
.lead{color:var(--sub);font-size:18px;margin-top:12px;max-width:640px}
.eyebrow{display:inline-block;font-size:13px;font-weight:700;color:var(--ac);background:var(--ac-soft);padding:4px 10px;border-radius:99px;margin-bottom:12px}
.crumb{font-size:14px;color:var(--sub);margin-bottom:14px}.crumb a{text-decoration:underline;text-underline-offset:3px}.crumb span{margin:0 6px;opacity:.5}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 24px;border-radius:14px;font-weight:700;font-size:16px;border:0;cursor:pointer;font-family:inherit;transition:transform .12s,box-shadow .12s}
.btn:active{transform:translateY(1px)}.btn-ac{background:var(--ac);color:#fff;box-shadow:0 8px 20px color-mix(in srgb,var(--ac) 32%,transparent)}
.btn:not([class*=btn-]){background:var(--ac);color:#fff}.btn.ghost{background:var(--ac-soft);color:var(--ac)}
.btn-line{background:#fff;color:var(--ink);border:1px solid var(--line)}.btn-ghost{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.45)}
.row{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.sec{padding:56px 0 0}.sec-h{margin-bottom:22px}.sec-h p{color:var(--sub);margin-top:6px}
.grid{display:grid;gap:14px;grid-template-columns:1fr}@media(min-width:640px){.grid.g2{grid-template-columns:1fr 1fr}.grid.g3{grid-template-columns:repeat(2,1fr)}}@media(min-width:960px){.grid.g3{grid-template-columns:repeat(3,1fr)}.grid.g4{grid-template-columns:repeat(4,1fr)}}@media(min-width:640px) and (max-width:959px){.grid.g4{grid-template-columns:repeat(2,1fr)}}
.card{display:block;background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:20px;transition:border-color .15s,box-shadow .15s}
a.card:hover,button.card:hover{border-color:color-mix(in srgb,var(--ac) 45%,var(--line));box-shadow:var(--sh)}
.card p{color:var(--sub);font-size:15.5px;margin-top:6px}.card .more{display:inline-block;margin-top:10px;font-size:14px;font-weight:700;color:var(--ac)}
.pcard{overflow:hidden;padding:0}.pcard .ph{aspect-ratio:16/10;background:var(--soft)}.pcard .ph img{width:100%;height:100%;object-fit:cover}.pcard .tx{padding:16px 18px 18px}
.panel{background:var(--soft);border-radius:20px;padding:24px}
.chips{display:flex;flex-wrap:wrap;gap:8px;list-style:none}.chips a,.chips span{display:inline-block;background:#fff;border:1px solid var(--line);border-radius:99px;padding:7px 14px;font-size:15px}
.chips a:hover{border-color:var(--ac);color:var(--ac)}
.prose p{font-size:17px}.prose p+p{margin-top:12px}
.facts{border-left:3px solid var(--ac);padding:4px 0 4px 16px;color:var(--ink);font-weight:500}
footer.site-f{margin-top:80px;background:#0f1728;color:#aab4c4;font-size:14px;padding:44px 0 120px}
footer.site-f b{color:#fff}footer.site-f a{color:#dfe5ee}footer.site-f .cols{display:grid;gap:22px;grid-template-columns:1fr}@media(min-width:720px){footer.site-f .cols{grid-template-columns:1.4fr 1fr 1fr}footer.site-f{padding-bottom:48px}}
footer.site-f ul{list-style:none;display:grid;gap:4px;margin-top:8px}
.fixbar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);border-top:1px solid var(--line)}
.fixbar .btn{flex:1;min-height:50px}.fixbar .btn:not([class*=btn-]){background:var(--ac);color:#fff}.btn.ghost{background:var(--ac-soft);color:var(--ac)}
.btn-line{flex:0 0 96px}@media(min-width:720px){.fixbar{display:none}}`;

const FONT = '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">';

// main: 슬러그 없는 첫 화면(/, 모든 지역). 그 밖의 화면은 천안(/cheonan) 머리글을 쓴다.
const header = (main) => (main
  ? `<header class="site-h"><div class="wrap"><a class="logo" href="/">${BRAND}<small>동네 생활 업체 연결 · by 비즈헬프</small></a>
<nav class="nav" aria-label="주요 메뉴"><a href="/#regions">지역 선택</a><a class="cta" href="/start">내 가게 등록</a></nav></div></header>`
  : `<header class="site-h"><div class="wrap"><a class="logo" href="${CITY}">${SITE}<small>천안 집수리·생활 업체 연결 · by 비즈헬프</small></a>
<nav class="nav" aria-label="주요 메뉴"><a href="${CITY}#keywords">집수리 찾기</a><a href="${CITY}#regions">지역별</a><a href="${CITY}#shops">우리 동네 업체</a><a class="cta" href="/start">내 가게 등록</a></nav></div></header>`);

const footer = (main) => `<footer class="site-f"><div class="wrap"><div class="cols">
<div><b>${main ? BRAND : SITE}</b><br>지역 골목상권 생활 밀착형 연계 플랫폼 · by 비즈헬프<br>${main ? '동네 이름으로 집수리·생활 업체를 찾고, 가까운 동네 업체와 이어 드려요.' : '천안 동남구·서북구 4개 읍·8개 면·19개 동의 집수리 상담을 동네 업체와 이어 드려요.'}</div>
<div><b>바로 가기</b><ul><li><a href="/">${BRAND} 처음</a></li><li><a href="${CITY}">천안</a></li><li><a href="/start">내 가게 등록하기</a></li></ul></div>
<div><b>안내</b><ul><li><a href="/privacy">개인정보 처리방침</a></li><li><a href="/sitemap.xml">사이트맵</a></li></ul></div>
</div></div></footer>`;

export function page({ title, desc, body, noindex = false, canonical, status = 200, head = '', accent = '', fixbar = '', wide = false, main = false }) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta name="theme-color" content="#ffffff">${SEO_META}${noindex ? '' : TRACKING}${head}${FONT}
<style>${CSS}${accent ? `:root{--ac:${accent}}` : ''}</style></head><body>
${header(main)}
<main${wide ? '' : ' class="wrap narrow" style="padding-top:28px"'}>${body}</main>
${footer(main)}${fixbar}
</body></html>`;
  // noindex 화면(/ack/<토큰>, /edit 등)은 주소에 토큰이 있어 리퍼러를 보내지 않는다
  const headers = { 'content-type': 'text/html; charset=utf-8', 'referrer-policy': noindex ? 'no-referrer' : 'strict-origin-when-cross-origin' };
  if (noindex) headers['x-robots-tag'] = 'noindex';
  else headers['cache-control'] = 'public, max-age=300';
  return new Response(html, { status, headers });
}
