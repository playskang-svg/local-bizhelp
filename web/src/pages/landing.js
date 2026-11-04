import { esc } from '../html.js';
import dongs from '../../../shared/dongs.json' with { type: 'json' };

const DONG_NAME = Object.fromEntries(dongs.map((d) => [d.slug, d.name]));
const CHANNEL_LABEL = { naverPlace: '네이버 플레이스', instagram: '인스타그램', kakao: '카카오 채널', blog: '블로그' };
export const PHOTO_RE = /^landings\/[\w-]+\/[\w-]+\.(jpg|png|webp)$/;

const CSS = `.lp-photos{display:grid;gap:8px;margin:0 0 20px}.lp-photos img{width:100%;height:auto;border-radius:var(--r);display:block}
.lp h2{margin:28px 0 8px}.lp ul{padding-left:20px;margin:0}
.lp-ch{display:flex;flex-wrap:wrap;gap:8px}.lp-ch a{border-radius:999px;background:var(--accent-tint);color:var(--accent);padding:8px 16px;text-decoration:none;font-weight:600}
.lp-form{background:var(--surface);border-radius:var(--r-lg);padding:20px;margin:28px 0 0;display:grid;gap:12px}
.lp-form label{display:grid;gap:4px;font-weight:600;font-size:15px}
.lp-form input[type=text],.lp-form input[type=tel],.lp-form input[type=date],.lp-form select{width:100%;min-width:0;font:inherit;padding:10px 12px;border:1px solid #d8d8d4;border-radius:12px;background:#fff}
.lp-form .chk{display:flex;gap:8px;align-items:flex-start;font-weight:400;font-size:14px;color:var(--muted)}.lp-form .chk input{margin-top:4px;flex:none}
.lp-form button{font:inherit;border:0;cursor:pointer;width:100%}.lp-hp{position:absolute;left:-9999px;height:0;overflow:hidden}
.lp-msg{margin:0;font-size:14px}
body{padding-bottom:76px}
.lp-bar{position:fixed;left:0;right:0;bottom:0;z-index:10;background:#fff;border-top:1px solid #eee;padding:8px 12px calc(8px + env(safe-area-inset-bottom));display:flex;gap:8px;justify-content:center}
.lp-bar>*{flex:1 1 0;min-width:0;max-width:170px;text-align:center;border-radius:999px;padding:12px 4px;font-family:inherit;font-weight:600;font-size:15px;line-height:1.2;text-decoration:none;background:var(--accent-tint);color:var(--accent);border:0;cursor:pointer;white-space:nowrap}
.lp-bar .main{background:var(--accent);color:#fff}`;

const SCRIPT = `(function(){
var d=document.getElementById('lp'),slug=d.dataset.slug,src=d.dataset.src||'direct',ss=null;
try{ss=window.sessionStorage}catch(e){}
function ok(v){return /^[a-z0-9-]{1,40}$/.test(v||'')}
try{var q=new URLSearchParams(location.search).get('src'),k=ss&&ss.getItem('lpsrc');
 if(k&&ok(k))src=k;else if(ok(q)){src=q;if(ss)ss.setItem('lpsrc',q)}}catch(e){}
var tel=document.getElementById('lp-tel');
if(tel)tel.addEventListener('click',function(){try{navigator.sendBeacon('/api/call',new Blob([JSON.stringify({slug:slug,src:src})],{type:'application/json'}))}catch(e){}});
var sh=document.getElementById('lp-share');
if(sh)sh.addEventListener('click',function(){var u=location.origin+location.pathname;
 if(navigator.share){navigator.share({title:document.title,url:u}).catch(function(){})}
 else if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){sh.textContent='복사됨'},function(){})}});
var f=document.getElementById('lp-form');
if(f)f.addEventListener('submit',function(e){e.preventDefault();var m=document.getElementById('lp-msg'),g=function(n){return f.elements[n]},b=f.querySelector('button[type=submit]');
 var o=f.querySelectorAll('.lp-err');for(var i=0;i<o.length;i++)o[i].remove();
 function show(n,msg){var t=g(n),l=t&&t.closest&&t.closest('label');if(l){var p=document.createElement('p');p.className='lp-msg lp-err';p.setAttribute('role','alert');p.textContent=msg;l.insertAdjacentElement('afterend',p);m.textContent=''}else m.textContent=msg}
 if(!g('consent').checked){show('consent','연락 동의에 체크해 주세요.');return}
 if(b.disabled)return;b.disabled=true;m.textContent='보내는 중이에요.';
 fetch('/api/inquiry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:slug,dong:g('dong').value,work:g('work').value,wishDate:g('wishDate').value,phone:g('phone').value,consent:true,hp:g('hp').value,src:src})})
 .then(function(r){return r.json().catch(function(){return{}}).then(function(j){return{ok:r.ok,j:j}})})
 .then(function(x){
  if(x.ok){m.textContent='문의를 보냈어요. 사장님이 곧 연락드릴 거예요.';return}
  b.disabled=false;
  if(x.j.field)show(x.j.field,x.j.message||'다시 확인해 주세요.');else m.textContent=x.j.message||'잠시 후 다시 시도해 주세요.'},function(){b.disabled=false;m.textContent='잠시 후 다시 시도해 주세요.'})});
})();`;

// Returns an escaped HTML fragment. opts.public adds the inquiry form, fixed bottom bar and script
// (the editor preview calls it without opts and gets the plain fragment).
// row: { name (verified business name), slug, content: object|json string, areas: array|json string }
export function renderLanding(row, opts = {}) {
  const parse = (v, d) => { if (typeof v !== 'string') return v ?? d; try { return JSON.parse(v); } catch { return d; } };
  let c = parse(row.content, {});
  if (!c || typeof c !== 'object' || Array.isArray(c)) c = {};
  const areas = parse(row.areas, []);
  const li = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const parts = [];
  const photos = (Array.isArray(c.photos) ? c.photos : []).filter((k) => typeof k === 'string' && PHOTO_RE.test(k));
  const shop = row.name || c.name || '가게 이름';
  const address = c.address || row.address;
  const digits = String(c.phone ?? '').replace(/\D/g, '');
  parts.push(`<h1>${esc(row.name || c.name || '가게 이름')}</h1>`);
  if (c.tagline) parts.push(`<p class="lead">${esc(c.tagline)}</p>`);
  if (photos.length) parts.push(`<div class="lp-photos">${photos.map((k, i) => `<img src="/media/${esc(k)}" alt="${esc(i ? `${shop} 사진 ${i + 1}` : shop)}" loading="${i ? 'lazy' : 'eager'}">`).join('')}</div>`);
  if (c.intro) parts.push(`<p>${esc(c.intro)}</p>`);
  if (c.services?.length) parts.push(`<h2>하는 일</h2>${li(c.services.map((x) => `<b>${esc(x.title)}</b> ${esc(x.detail)}`))}`);
  if (c.excludes?.length) parts.push(`<h2>하지 않는 일</h2>${li(c.excludes.map(esc))}`);
  if (c.extraCosts?.length) parts.push(`<h2>추가 비용이 생기는 경우</h2>${li(c.extraCosts.map((x) => `<b>${esc(x.when)}</b> ${esc(x.note)}`))}`);
  if (areas.length) parts.push(`<h2>출장 동네</h2><p>${areas.map((a) => esc(DONG_NAME[a] ?? a)).join(', ')}</p>`);
  if (c.hours) parts.push(`<h2>영업시간</h2><p>${esc(c.hours)}</p>`);
  if (c.phone) parts.push(`<h2>연락처</h2><p>${esc(c.phone)}</p>`);
  const ch = Object.entries(c.channels ?? {}).filter(([, u]) => /^https:\/\//.test(u));
  if (ch.length) {
    parts.push(`<h2>채널</h2>${opts.public
      ? `<div class="lp-ch">${ch.map(([k, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(CHANNEL_LABEL[k] ?? k)}</a>`).join('')}</div>`
      : li(ch.map(([k, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(k)}</a>`))}`);
  }
  if (!opts.public) return parts.join('');

  if (areas.length) {
    parts.push(`<form class="lp-form" id="lp-form" method="post" action="/api/inquiry" aria-label="문의하기"><h2 style="margin:0">문의하기</h2>
<label>동네<select name="dong" required aria-label="동네">${areas.map((a) => `<option value="${esc(a)}">${esc(DONG_NAME[a] ?? a)}</option>`).join('')}</select></label>
<label>작업<input type="text" name="work" maxlength="100" required aria-label="작업" placeholder="예: 입주청소 24평"></label>
<label>희망 날짜<input type="date" name="wishDate" aria-label="희망 날짜"></label>
<label>휴대폰<input type="tel" name="phone" inputmode="tel" autocomplete="tel" required aria-label="휴대폰" placeholder="01012345678"></label>
<label class="chk"><input type="checkbox" name="consent" aria-label="연락 동의"><span>이 업체가 연락할 수 있도록 휴대폰 번호를 이 업체에만 전달하는 데 동의해요.</span></label>
<div class="lp-hp" aria-hidden="true"><input type="text" name="hp" tabindex="-1" autocomplete="off"></div>
<input type="hidden" name="src" value="${esc(opts.src || 'direct')}">
<button class="btn" type="submit">문의 보내기</button><p class="lp-msg" id="lp-msg" role="status" aria-live="polite"></p></form>`);
  }
  const bar = [];
  if (digits) bar.push(`<a class="main" id="lp-tel" href="tel:${esc(digits)}" aria-label="전화하기">전화</a>`, `<a href="sms:${esc(digits)}" aria-label="문자 보내기">문자</a>`);
  if (address) bar.push(`<a href="https://map.naver.com/p/search/${encodeURIComponent(address)}" rel="noopener" aria-label="길찾기">길찾기</a>`);
  bar.push('<button type="button" id="lp-share" aria-label="공유하기">공유</button>');
  return `<style>${CSS}</style><div class="lp" id="lp" data-slug="${esc(row.slug ?? '')}" data-src="${esc(opts.src || '')}">${parts.join('')}</div>
<nav class="lp-bar" aria-label="연락">${bar.join('')}</nav><script>${SCRIPT}</script>`;
}
