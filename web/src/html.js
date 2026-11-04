const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

export const cleanSrc = (v) => (/^[a-z0-9-]{1,40}$/.test(v ?? '') ? v : '');
export const withSrc = (path, src) => (src ? `${path}?src=${src}` : path);

const CSS = `:root{--bg:#fff;--surface:#f6f6f4;--ink:#111;--muted:#6b6b6b;--accent:#b11226;--accent-tint:#fbeef0;--r:20px;--r-lg:28px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 Pretendard Variable,Pretendard,system-ui,sans-serif;overflow-wrap:anywhere}
a{color:inherit}.wrap{max-width:720px;margin:0 auto;padding:0 20px}
header{padding:20px 0}header a{font-weight:700;text-decoration:none}
h1{font-size:28px;line-height:1.3;margin:16px 0 8px}h2{font-size:20px;margin:0 0 8px}
.lead{color:var(--muted);margin:0 0 24px}
.grid{display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:560px){.grid{grid-template-columns:1fr 1fr}}
.card{display:block;background:var(--surface);border-radius:var(--r);padding:20px}
.card p{margin:0 0 12px;color:var(--muted)}
.btn{display:inline-block;border-radius:999px;background:var(--accent);color:#fff;padding:10px 20px;font-weight:600;text-decoration:none}
.btn.ghost{background:var(--accent-tint);color:var(--accent)}
.panel{background:var(--surface);border-radius:var(--r-lg);padding:24px;margin:0 0 24px}
.panel .card{background:var(--bg)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.chips a{display:inline-block;border-radius:999px;background:var(--surface);padding:6px 14px;text-decoration:none}
footer{margin-top:48px;padding:24px 0 40px;color:var(--muted);font-size:14px;border-top:1px solid var(--surface)}`;

export function page({ title, desc, body, noindex = false, canonical, status = 200, head = '' }) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
${head}<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${CSS}</style></head><body>
<header><div class="wrap"><a href="/">로컬브릿지AI_천안</a></div></header>
<main class="wrap">${body}</main>
<footer><div class="wrap">지역 골목상권 생활 밀착형 연계 플랫폼 · by 비즈헬프 · <a href="/privacy">개인정보 처리방침</a></div></footer>
</body></html>`;
  const headers = { 'content-type': 'text/html; charset=utf-8', 'referrer-policy': 'no-referrer' };
  if (noindex) headers['x-robots-tag'] = 'noindex';
  return new Response(html, { status, headers });
}
