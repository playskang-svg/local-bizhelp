import { GUIDE_LIST } from '../pages/guide.js';
// 키워드 사이트 화면. suriwiki 키워드 사이트(bizhelp/scripts/page-template.mjs)의 구성 —
// 히어로(+전후 사진) → 신뢰 띠 → 작업 항목 → 증상 → 전후 비교 → 유형 안내 → 진행 절차 → 지역 → FAQ → 체크하고 문자 보내기 —
// 을 local.bizhelp.kr 한 도메인 안의 /<키워드>/<지역> 구조로 옮기고, 디자인은 새로 짰다.
import { page, esc, jsonLd, withSrc, ORIGIN, SITE, BRAND, CITY } from '../html.js';
import { GROUPS, REGIONS, GU_LABEL, LEVEL_LABEL, groupOf, regionOf, nearOf, kwPath, pagePath, areaPath, regionIndex, HERO } from './data.js';
import { composePage, faqOf, sectionOrder, TEMPLATES, josa, factLine, coverageLine, hashCode, rotate } from './compose.js';
import { BA } from './data.js';
import { contactOf } from './contact.js';
import { directForm, directScript, DIRECT_CSS } from './direct-form.js';
import { TRADES } from '../pages/dong.js';
import dongsJson from '../../../shared/dongs.json' with { type: 'json' };

const accentOf = (g) => (TEMPLATES[g.template] || TEMPLATES.consult).accent;
const guideOf = (g, s) => (g.content.guide || {})[s] || null;
const digits = (v) => String(v || '').replace(/\D/g, '');
const telShow = (d) => (d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d);

// 히어로·카드 사진: suriwiki 사이트 이미지가 있으면 그것, 없으면 그룹의 첫 전후 사진(작업 후)
export const heroOf = (g) => (HERO[g.slug] || []).includes('hero-1.webp') ? `/img/${g.slug}/hero-1.webp` : (BA[g.slug] || [])[0] ? `/ba/${g.slug}/${BA[g.slug][0]}-after.webp` : '';
export const cardOf = (g) => (HERO[g.slug] || []).includes('card-1.webp') ? `/img/${g.slug}/card-1.webp` : heroOf(g);

// 행정 단위 → 등록 업체(dongs 테이블) 슬러그. 법정동·생활권은 위 행정동을 따른다.
const DONG_BY_NAME = Object.fromEntries(dongsJson.map((d) => [d.name, d.slug]));
const DONG_NAME = Object.fromEntries(dongsJson.map((d) => [d.slug, d.name]));
export function dongSlugOf(r) {
  for (let x = r; x; x = regionOf(x.parent)) if (DONG_BY_NAME[x.name]) return DONG_BY_NAME[x.name];
  return null;
}

const KCSS = `.hero{position:relative;background:#23211d;color:#fff;overflow:hidden}.hero .bg{position:absolute;inset:0}.hero .bg img{width:100%;height:100%;object-fit:cover;opacity:.5}
.hero .bg:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,14,.15),rgba(20,18,14,.85))}
.hero .in{position:relative;padding:56px 20px 44px;max-width:1080px;margin:0 auto}.hero .crumb,.hero .crumb a{color:#ddd6c8}.hero .lead{color:#ece6da}
.hero .hl{font-size:clamp(18px,3.6vw,22px);font-weight:700;color:#efd2b8;margin-top:10px}
.hero .ev{display:flex;gap:10px;margin-top:26px;max-width:420px}.hero .ev figure{position:relative;flex:1;aspect-ratio:4/5;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.25)}
.hero .ev img{width:100%;height:100%;object-fit:cover}.hero .ev figcaption{position:absolute;left:8px;top:8px;font-size:12px;font-weight:700;background:rgba(20,18,14,.75);padding:2px 9px;border-radius:99px}
.ba{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:#fff}
.ba-s{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--soft);touch-action:pan-y;user-select:none;cursor:ew-resize}
.ba-s img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}.ba-s .b{clip-path:inset(0 50% 0 0)}
.ba-s .h{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);pointer-events:none}
.ba-s .h:after{content:"";position:absolute;top:50%;left:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M9 7l-5 5 5 5M15 7l5 5-5 5'/%3E%3C/svg%3E") center/18px no-repeat;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.ba-s .t{position:absolute;top:10px;font-size:12px;font-weight:700;color:#fff;background:rgba(20,18,14,.72);padding:2px 9px;border-radius:99px}.ba-s .tb{left:10px}.ba-s .ta{right:10px}
.ba .cap{padding:12px 16px;font-size:15px;font-weight:600}
.tbl{width:100%;border-collapse:collapse;font-size:15.5px}.tbl th,.tbl td{text-align:left;padding:13px 10px;border-bottom:1px solid var(--line);vertical-align:top}.tbl th{font-size:13px;color:var(--sub)}
@media(max-width:640px){.tbl thead{display:none}.tbl tr{display:block;border-bottom:1px solid var(--line);padding:12px 0}.tbl td{display:block;border:0;padding:2px 0}.tbl td:first-child{font-weight:800;font-size:17px}}
.steps{display:grid;gap:12px;counter-reset:s}@media(min-width:760px){.steps{grid-template-columns:repeat(4,1fr)}}
.steps li{list-style:none;background:var(--soft);border-radius:var(--r);padding:18px}.steps li:before{counter-increment:s;content:"0" counter(s);display:block;font-weight:800;color:var(--ac);margin-bottom:4px}
.steps p{color:var(--sub);font-size:15px}
details{border-bottom:1px solid var(--line)}summary{list-style:none;cursor:pointer;padding:18px 34px 18px 0;font-weight:700;font-size:17px;position:relative}summary::-webkit-details-marker{display:none}
summary:after{content:"+";position:absolute;right:4px;top:14px;font-size:24px;font-weight:400;color:var(--ac)}details[open] summary:after{content:"−"}details p{padding:0 0 18px;color:var(--sub)}
.picker{border:1px solid var(--line);border-radius:22px;padding:26px 22px;box-shadow:var(--sh);background:#fff}
.why{background:var(--ac-soft);border-radius:var(--r);padding:18px 20px;margin-bottom:22px}.why b{display:block;font-size:19px;margin-bottom:4px}
.pg{margin-top:20px}.pg h3{font-size:15px;color:var(--sub);margin-bottom:8px}.pg .chips{gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:99px;padding:9px 15px;font-size:15.5px;cursor:pointer;user-select:none;background:#fff}
.chip input{position:absolute;opacity:0;pointer-events:none}.chip.on{background:var(--ac);border-color:var(--ac);color:#fff}
.chip:focus-within{outline:2px solid var(--ac);outline-offset:2px}
.pv{margin-top:20px;background:var(--soft);border-radius:12px;padding:14px 16px;font-size:14.5px;color:var(--sub);white-space:pre-line}
.picker .btn-ac{width:100%;margin-top:14px}.hint{margin-top:10px;font-size:14px;color:var(--sub)}
.kw-grid .pcard h3{font-size:18px}.kw-grid .pcard p{font-size:14.5px}
.rgn h3{font-size:15px;color:var(--sub);margin:18px 0 8px}.rgn .chips a{font-size:14.5px;padding:6px 12px}
.home-hero{background:linear-gradient(180deg,var(--soft),var(--bg));padding:52px 0 36px}

.dh{position:relative;color:#fff;background:#23211d;overflow:hidden;display:flex;align-items:flex-end;min-height:clamp(440px,58vw,580px)}.dh.sm-h{min-height:clamp(360px,42vw,420px)}
.dh .bg{position:absolute;inset:0}.dh .bg img{width:100%;height:100%;object-fit:cover}.dh .bg:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,14,.18),rgba(20,18,14,.76))}
.dh .in{position:relative;z-index:2;width:100%;max-width:1120px;margin:0 auto;padding:84px 20px 86px}
.dh .ey{font-size:12.5px;letter-spacing:.14em;opacity:.9;margin-bottom:16px;font-weight:600}
.dh h1{color:#fff;font-size:clamp(32px,7vw,60px);line-height:1.16;text-shadow:0 2px 18px rgba(0,0,0,.25)}
.dh p{font-size:clamp(15px,2.4vw,17px);line-height:1.7;max-width:540px;margin-top:18px;opacity:.95}
.finder{position:relative;z-index:3;display:grid;grid-template-columns:1fr;margin-top:-46px;background:#fff;border-radius:var(--r);box-shadow:0 18px 40px rgba(35,33,29,.16);padding:12px}
.finder .fc{padding:10px 16px;border-bottom:1px solid var(--line)}.finder label{display:block;font-size:11.5px;color:var(--sub);letter-spacing:.06em;font-weight:600;margin-bottom:2px}
.finder select{width:100%;border:0;background:transparent;font:inherit;font-size:16px;font-weight:700;color:var(--ink);padding:4px 0;min-height:34px;cursor:pointer}
.finder .btn{margin-top:12px;width:100%;min-height:54px}
@media(min-width:760px){.finder{grid-template-columns:1.2fr 1.2fr auto;align-items:center}.finder .fc{border-bottom:0;border-right:1px solid var(--line)}.finder .btn{margin:0 0 0 12px;width:auto;padding:0 40px;min-height:58px}}
.trust{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:44px}
.trust div{padding:18px 14px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);font-size:13px;line-height:1.55;color:var(--sub)}
.trust b{display:block;font-family:var(--serif);color:var(--ac);font-size:18px;line-height:1.35;margin-bottom:3px;font-weight:700}
.trust div:nth-child(2n){border-right:0}.trust div:nth-last-child(-n+2){border-bottom:0}
@media(min-width:760px){.trust{grid-template-columns:repeat(4,1fr)}.trust div{border-bottom:0;padding:26px 22px;font-size:13.5px}.trust div:nth-child(2n){border-right:1px solid var(--line)}.trust div:last-child{border-right:0}.trust b{font-size:23px}}
.pop{display:grid;gap:16px;grid-template-columns:1fr}@media(min-width:760px){.pop{grid-template-columns:1.4fr 1fr 1fr}}
.cd{position:relative;display:block;border-radius:var(--r);overflow:hidden;background:#2b2823;min-height:240px;color:#fff;isolation:isolate}@media(min-width:760px){.cd{min-height:340px}.cd.lg{min-height:420px}}
.cd img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transition:transform .5s}.cd:hover img{transform:scale(1.04)}
.cd:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(20,18,14,0) 36%,rgba(20,18,14,.82))}
.cd .t{position:absolute;display:block;left:22px;right:22px;bottom:20px}.cd .t b{display:block;font-family:var(--serif);font-size:22px;line-height:1.3;margin-bottom:6px;font-weight:700}.cd .t span{display:block;font-size:13px;line-height:1.5;opacity:.92}
.sm{display:grid;gap:12px;grid-template-columns:repeat(2,1fr);margin-top:16px}@media(min-width:760px){.sm{grid-template-columns:repeat(5,1fr)}}
.sm a{display:block;border:1px solid var(--line);border-radius:var(--r2);padding:16px;background:#fff;transition:border-color .15s,box-shadow .15s}.sm a:hover{border-color:var(--ac);box-shadow:var(--sh)}
.sm b{display:block;font-size:15px;line-height:1.4;margin-bottom:4px}.sm span{display:block;font-size:12.5px;color:var(--sub);line-height:1.5}
.how{display:grid;grid-template-columns:1fr;border-top:1px solid var(--ink);list-style:none}@media(min-width:760px){.how{grid-template-columns:repeat(3,1fr)}}
.how li{padding:24px 24px 8px 0}.how i{font-style:normal;font-family:var(--serif);font-size:34px;line-height:1;color:var(--ac)}.how b{display:block;font-size:18px;margin:12px 0 6px}.how span{display:block;color:var(--sub);font-size:15px;line-height:1.7}
.rw{display:grid;gap:14px;grid-template-columns:repeat(2,1fr)}@media(min-width:760px){.rw{grid-template-columns:repeat(4,1fr);gap:18px}}
.rw figure{position:relative}.rw img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--r);background:var(--soft)}.rw figcaption{margin-top:10px;font-size:14.5px;font-weight:600}.rw figcaption span{display:block;color:var(--sub);font-size:12.5px;font-weight:400;margin-top:2px}
.tag{position:absolute;z-index:2;top:12px;left:12px;background:rgba(255,255,255,.94);color:var(--ink);font-size:11px;padding:5px 10px;border-radius:99px;font-weight:700;letter-spacing:.04em}
.partner{margin-top:72px;border-radius:var(--r);background:var(--ac);color:#fff;padding:36px 26px;display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap}@media(min-width:760px){.partner{padding:52px 56px}}
.partner h2{color:#fff;font-size:clamp(22px,3.6vw,30px)}.partner p{opacity:.88;font-size:15px;margin-top:8px}.partner a.btn{background:#fff;color:var(--ink);box-shadow:none}.partner a.btn:hover{background:var(--soft)}
.tabs{display:flex;gap:26px;border-bottom:1px solid var(--line)}.tabs[hidden]{display:none}.tabs button{background:none;border:0;font:inherit;font-size:15.5px;color:var(--sub);padding:12px 0;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}.tabs button[aria-selected=true]{color:var(--ink);font-weight:700;border-bottom-color:var(--ac)}
.tpanel{padding-top:18px}.tpanel[hidden]{display:none}.tp-h{font-size:15px;color:var(--sub);margin:8px 0}.js .tp-h{display:none}
.chips a.on{background:var(--ink);color:#fff;border-color:var(--ink)}.js .tpanel:not(.open) .chips a.x{display:none}
.chipmore{display:none;background:#fff;border:1px solid var(--line);border-radius:99px;padding:7px 14px;font:inherit;font-size:15px;cursor:pointer;color:var(--ink)}.js .chipmore{display:inline-block}.chipmore:hover{border-color:var(--ac);color:var(--ac)}
.vend{display:grid;gap:18px;grid-template-columns:1fr}@media(min-width:760px){.vend{grid-template-columns:repeat(3,1fr)}}
.v{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:#fff;display:flex;flex-direction:column}.v .vp{height:190px;background:var(--soft);display:flex;align-items:center;justify-content:center;color:var(--sub);font-family:var(--serif);font-size:34px}.v .vp img{width:100%;height:100%;object-fit:cover}
.v .vb{padding:20px;display:flex;flex-direction:column;gap:10px;flex:1}.v b{font-size:17px;line-height:1.4}.v p{font-size:14px;color:var(--sub);line-height:1.6}.v .tg{display:flex;flex-wrap:wrap;gap:6px}.v .tg span{font-size:11.5px;background:#efe8da;padding:4px 10px;border-radius:99px}.v a.btn{margin-top:auto;min-height:46px;font-size:14.5px;width:100%}`;

const pickerScript = (ct, kw, pageName, region, g, r) => `<script>(function(){
var CT=${JSON.stringify({ mode: ct.mode, phone: ct.phone, url: ct.url || '', subs: ct.subs || {} })},KW=${JSON.stringify(kw)},PAGE=${JSON.stringify(pageName)},REGION=${JSON.stringify(region)},G=${JSON.stringify(g)},R=${JSON.stringify(r)};
var btn=document.getElementById('sms-go'),pv=document.getElementById('sms-pv');if(!btn)return;
function pick(c){return [].slice.call(document.querySelectorAll('input[data-cat="'+c+'"]:checked')).map(function(e){return e.value})}
function body(){var L=['['+KW+'] '+PAGE],a=pick('작업'),b=pick('증상'),d=pick('지역');
if(a.length)L.push('작업: '+a.join('\\u00b7'));if(b.length)L.push('증상: '+b.join('\\u00b7'));L.push('지역: '+(d.length?d.join('\\u00b7'):REGION||'천안'));if(CT.mode==='sms')L.push('\\u203b 사진은 이 문자에 붙여서 보낼게요');return L.join('\\n')}
function build(){var t=body();if(CT.mode==='sms'){btn.href='sms:'+CT.phone+'?body='+encodeURIComponent(t);pv.textContent='보낼 문자 미리보기\\n'+t}else{var a=pick('작업'),u='';for(var i=0;i<a.length&&!u;i++)u=CT.subs[a[i]]||'';btn.href=u||CT.url;pv.textContent='견적 요청에 적을 내용\\n'+t}}
document.querySelectorAll('.picker input').forEach(function(el){el.addEventListener('change',function(){el.closest('label').classList.toggle('on',el.checked);build()})});
document.querySelectorAll('[data-pick]').forEach(function(a){a.addEventListener('click',function(){var p=a.getAttribute('data-pick').split(':');document.querySelectorAll('.picker input[data-cat="'+p[0]+'"]').forEach(function(el){if(el.value===p.slice(1).join(':')){el.checked=true;el.closest('label').classList.add('on')}});build()})});
btn.addEventListener('click',function(){try{if(CT.mode!=='sms'&&navigator.clipboard)navigator.clipboard.writeText(body()).catch(function(){});var q=new URLSearchParams(location.search);navigator.sendBeacon('/api/lead',new Blob([JSON.stringify({g:G,r:R,kind:CT.mode,work:pick('작업'),symptom:pick('증상'),area:pick('지역'),src:q.get('src')||''})],{type:'application/json'}))}catch(e){}});
build();
document.querySelectorAll('[data-ba]').forEach(function(s){var b=s.querySelector('.b'),h=s.querySelector('.h'),on=false;
function set(x){var r=s.getBoundingClientRect(),p=Math.max(0,Math.min(1,(x-r.left)/r.width));b.style.clipPath='inset(0 '+((1-p)*100)+'% 0 0)';h.style.left=(p*100)+'%'}
s.addEventListener('pointerdown',function(e){on=true;try{s.setPointerCapture(e.pointerId)}catch(_){}set(e.clientX)});s.addEventListener('pointermove',function(e){if(on)set(e.clientX)});
s.addEventListener('pointerup',function(){on=false});s.addEventListener('pointercancel',function(){on=false})});
})();</script>`;

const chipGroup = (cat, title, values, pre = []) => `<div class="pg"><h3>${esc(title)}</h3><div class="chips">${values.map((v) => `<label class="chip${pre.includes(v) ? ' on' : ''}"><input type="checkbox" data-cat="${esc(cat)}" value="${esc(v)}"${pre.includes(v) ? ' checked' : ''}>${esc(v)}</label>`).join('')}</div></div>`;

// 상담 문구: 문자 모드와 견적 모드
const CTA = { sms: '사진 보내고 문자 상담', quote: '견적 받기' };
const hasContact = (ct) => ct.mode === 'sms' || !!ct.url;

function pickerBlock(g, { areas, pre = [], ct }) {
  const sms = ct.mode === 'sms';
  if (!hasContact(ct)) return ''; // 번호도 견적 링크도 없으면 상담 칸을 그리지 않는다
  return `<section class="sec" id="picker"><div class="picker">
${sms ? '<div class="why"><b>사진 한 장이 가장 정확한 설명이에요</b>멀리서 한 장, 가까이서 한두 장이면 충분해요. 사진을 먼저 보고 가능 여부와 맞는 방법부터 말씀드려요.</div>'
    : '<div class="why"><b>여러 업체 견적을 한 번에 받아 비교해 보세요</b>아래에서 체크한 내용은 버튼을 누를 때 복사돼요. 견적 요청 화면에 그대로 붙여 넣으면 설명을 다시 쓸 필요가 없어요.</div>'}
<h2>${sms ? '체크하고 문자 보내기' : '체크하고 견적 받기'}</h2><p class="lead" style="font-size:16px;margin-top:6px">${sms ? '해당하는 걸 누르면 문자 내용이 자동으로 채워져요. 문자 창이 열리면 사진만 붙여 보내 주세요.' : '작업을 고르면 그 작업에 맞는 견적 요청 화면으로 연결돼요.'}</p>
${chipGroup('작업', '어떤 작업인가요?', [...g.subs, '잘 모르겠어요'])}
${(g.content.symptoms || []).length ? chipGroup('증상', '어떤 증상인가요?', [...g.content.symptoms, '기타']) : ''}
${chipGroup('지역', '어디인가요?', [...areas, '천안 다른 지역'], pre)}
<div class="pv" id="sms-pv"></div>
<a id="sms-go" class="btn btn-ac" ${sms ? `href="sms:${esc(ct.phone)}"` : `href="${esc(ct.url)}" target="_blank" rel="sponsored noopener"`}>${sms ? '문자로 보내기' : '견적 받기'}</a>
<p class="hint">${sms ? '문자 창에서 ＋ 또는 📎을 눌러 사진을 붙이면 돼요. 보내 주신 내용은 동네 업체 연결에만 써요.'
    : `${ct.closest ? `이 작업은 딱 맞는 견적 항목이 없어 가장 가까운 '${esc(ct.closest)}' 항목으로 연결돼요. ` : ''}견적 받기는 제휴 견적 서비스로 연결되며, 이용 시 운영자가 수수료를 받을 수 있어요.`}</p></div></section>`;
}

const baCell = (p, alt) => `<div class="ba"><div class="ba-s" data-ba><img class="a" src="${esc(p.after)}" alt="${esc(alt)} 작업 후" loading="lazy" decoding="async"><img class="b" src="${esc(p.before)}" alt="${esc(alt)} 작업 전" loading="lazy" decoding="async"><div class="h"></div><span class="t tb">작업 전</span><span class="t ta">작업 후</span></div><div class="cap">${esc(p.caption)}</div></div>`;

function heroBlock({ img, crumb, h1, hl, lead, ev, ct }) {
  return `<section class="hero">${img ? `<div class="bg"><img src="${esc(img)}" alt="" fetchpriority="high"></div>` : ''}<div class="in">
${crumb ? `<div class="crumb">${crumb}</div>` : ''}<h1>${esc(h1)}</h1><p class="hl">${esc(hl)}</p><p class="lead">${esc(lead)}</p>
<div class="row">${hasContact(ct) ? `<a class="btn btn-ac" href="#picker">${CTA[ct.mode]}</a>` : ''}<a class="btn btn-ghost" href="#cases">작업 사례 보기</a></div>
${ev ? `<div class="ev"><figure><img src="${esc(ev.before)}" alt="${esc(h1)} 작업 전" loading="eager"><figcaption>작업 전</figcaption></figure><figure><img src="${esc(ev.after)}" alt="${esc(h1)} 작업 후" loading="eager"><figcaption>작업 후</figcaption></figure></div>` : ''}</div></section>`;
}

const trustBlock = (g, r, ct) => `<div class="wrap">${trustInner(g, r, ct)}</div>`;
const trustInner = (g, r, ct) => (ct.mode === 'sms'
  ? `<div class="trust" style="margin-top:0"><div><b>사진 먼저</b>가능 여부부터 안내</div><div><b>${r ? esc(r.name) : '천안 66곳'}</b>${r ? '가까운 업체 연결' : '읍·면·동별 상담'}</div><div><b>문자·전화</b>편한 쪽으로 상담</div><div><b>비용은</b>현장 확인 후 안내</div></div>`
  : `<div class="trust" style="margin-top:0"><div><b>견적 비교</b>여러 업체 견적을 한 번에</div><div><b>${r ? esc(r.name) : '천안 66곳'}</b>${r ? '동네 기준 안내' : '읍·면·동별 안내'}</div><div><b>실제 사진</b>작업 전후 사례</div><div><b>비용은</b>현장 확인 후 결정</div></div>`);

const fixbar = (ct) => (hasContact(ct) ? `<div class="fixbar"><a class="btn btn-ac" href="#picker">${CTA[ct.mode]}</a>${ct.phone ? `<a class="btn btn-line" href="tel:${esc(ct.phone)}">전화</a>` : ''}</div>` : '');

const crumbs = (items) => items.map(([n, h]) => (h ? `<a href="${esc(h)}">${esc(n)}</a>` : esc(n))).join('<span>›</span>');
const breadcrumbLd = (items) => jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + path })) });
const faqLd = (faq) => jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const og = (title, desc, url, img, site = SITE) => `<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site)}"><meta property="og:locale" content="ko_KR"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">${img ? `<meta property="og:image" content="${esc(ORIGIN + img)}"><meta name="twitter:card" content="summary_large_image">` : ''}`;
const verify = (env) => `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">${env?.SEO_NAVER_VERIFY ? `<meta name="naver-site-verification" content="${esc(env.SEO_NAVER_VERIFY)}">` : ''}${env?.SEO_GOOGLE_VERIFY ? `<meta name="google-site-verification" content="${esc(env.SEO_GOOGLE_VERIFY)}">` : ''}`;

function shopsBlock(shops, r, src) {
  const dong = dongSlugOf(r);
  const cards = shops.map((l) => { let c = {}; try { c = JSON.parse(l.content || '{}'); } catch { /* 깨진 content: 이름만 */ } return `<a class="card" href="${esc(withSrc(`/p/${l.slug}`, src))}"><h3>${esc(l.name || c.name)}</h3>${c.tagline ? `<p>${esc(c.tagline)}</p>` : ''}<span class="more">업체 페이지 보기 →</span></a>`; }).join('');
  return `<section class="sec" id="shops"><div class="sec-h"><h2>${esc(r.name)} 등록 업체</h2><p>${shops.length ? '직접 페이지를 만든 동네 업체예요. 업체 페이지에서 바로 문의할 수 있어요.' : '아직 이 동네에 직접 등록한 업체가 없어요. 위 문자 상담으로 남겨 주시면 가까운 업체와 이어 드려요.'}</p></div>
${cards ? `<div class="grid g2">${cards}</div>` : ''}<div class="row" style="margin-top:14px">${dong ? `<a class="btn btn-line" href="${esc(withSrc(`/d/${dong}`, src))}">${esc(DONG_NAME[dong])} 업체 전체 보기</a>` : ''}<a class="btn btn-line" href="https://m.bizhelp.kr/free">홍보페이지 만들기 (무료)</a></div></section>`;
}

// ── 키워드 × 지역
export async function regionPage(env, g, r, src, shops = []) {
  const c = composePage(g, r);
  const ct = contactOf(env, g);
  const name = `${r.name} ${g.keyword}`;
  const url = ORIGIN + pagePath(g, r);
  const title = `${name} | ${c.s1}·${c.s2} 사진 상담 - ${SITE}`;
  const desc = `${r.full} ${g.keyword} 상담. ${c.subs.slice(0, 3).join('·')} — 사진을 먼저 보고 가능 여부를 안내하고 ${r.name} 가까운 업체와 이어 드려요.`;
  const items = [['천안 집수리', CITY], [g.keyword, kwPath(g)], [r.name, pagePath(g, r)]];
  const sec = {
    intro: () => `<section class="sec"><div class="sec-h"><span class="eyebrow">${esc(LEVEL_LABEL[r.level])} · ${esc(r.gu ? GU_LABEL[r.gu] : '천안시')}</span><h2>${esc(name)} 안내</h2></div>
<div class="prose"><p class="facts">${esc(c.fact)}</p>${c.local.map((t) => `<p>${esc(t)}</p>`).join('')}${c.guideLines.length ? `<p>${esc(c.guideLines.join(' '))}</p>` : ''}<p>${esc(c.coverage)}</p></div></section>`,
    items: () => `<section class="sec"><div class="sec-h"><h2>${esc(r.name)}에서 많이 맡기는 ${esc(g.keyword)} 작업</h2><p>눌러서 문자 상담에 담을 수 있어요.</p></div><div class="grid g3">${c.subs.map((s) => `<a class="card" href="#picker" data-pick="작업:${esc(s)}"><h3>${esc(s)}</h3><p>${esc(guideOf(g, s) ? `${guideOf(g, s).target}.` : `${s} 상담`)}</p><span class="more">상담에 담기 +</span></a>`).join('')}</div></section>`,
    compare: () => (c.photos.length ? `<section class="sec" id="cases"><div class="sec-h"><h2>${esc(g.keyword)} 작업 전후</h2><p>손잡이를 좌우로 밀면 같은 자리의 작업 전과 후가 바뀌어요. 실제 작업 사진이에요.</p></div><div class="grid g2">${c.photos.map((p) => baCell(p, `${g.keyword}`)).join('')}</div></section>` : ''),
    symptoms: () => ((g.content.symptoms || []).length ? `<section class="sec"><div class="sec-h"><h2>이런 증상이라면 상담해 보세요</h2></div><div class="chips">${rotate(g.content.symptoms, c.seed).map((s) => `<a href="#picker" data-pick="증상:${esc(s)}">${esc(s)}</a>`).join('')}</div></section>` : ''),
    guide: () => { const rows = c.subs.map((s) => [s, guideOf(g, s)]).filter(([, x]) => x); return rows.length ? `<section class="sec"><div class="sec-h"><h2>${esc(g.keyword)} 유형별 안내</h2><p>어떤 경우에 맞는지, 얼마나 걸리는지 정리했어요. 비용은 현장 확인 후 안내해요.</p></div><table class="tbl"><thead><tr><th>작업</th><th>이럴 때</th><th>소요 시간</th><th>알아 둘 점</th></tr></thead><tbody>${rows.map(([s, x]) => `<tr><td>${esc(s)}</td><td>${esc(x.target)}</td><td>${esc(x.time)}</td><td>${esc(x.point)}</td></tr>`).join('')}</tbody></table></section>` : ''; },
    shops: () => shopsBlock(shops, r, src),
    area: () => `${c.longtail.length ? `<section class="sec"><div class="sec-h"><h2>${esc(r.name)}에서 이렇게 찾으셨나요?</h2><p>아래 작업도 같은 방법으로 상담할 수 있어요.</p></div><div class="chips">${c.longtail.map((t) => `<a href="#picker">${esc(t)}</a>`).join('')}</div></section>` : ''}<section class="sec"><div class="sec-h"><h2>${esc(r.name)} 가까운 지역 ${esc(g.keyword)}</h2></div><div class="chips">${c.near.map((x) => `<a href="${esc(pagePath(g, x))}">${esc(x.name)} ${esc(g.keyword)}</a>`).join('')}<a href="${esc(areaPath(r))}">${esc(r.name)} 다른 집수리</a></div></section>`,
    faq: () => `<section class="sec"><div class="sec-h"><h2>자주 묻는 질문</h2></div>${c.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`,
    picker: () => pickerBlock(g, { areas: [r.name, ...c.near.slice(0, 5).map((x) => x.name)], pre: [r.name], ct }),
  };
  const ev = c.photos[0];
  const body = `${heroBlock({ img: heroOf(g), crumb: crumbs(items), h1: name, hl: c.headline, lead: desc, ev, ct })}${trustBlock(g, r, ct)}
<div class="wrap">${sectionOrder(g, c.seed).map((n) => sec[n]()).join('')}${directForm({ g, r, pageType: 'kw_region' })}</div>${pickerScript(ct, g.keyword, name, r.name, g.slug, r.slug)}${directScript({ pageType: 'kw_region', g: g.slug, r: r.slug })}`;
  const head = `${og(title, desc, url, ev ? ev.after : heroOf(g))}${verify(env)}<meta name="keywords" content="${esc([name, ...c.subs.slice(0, 4).map((s) => `${r.name} ${s}`), ...c.longtail.slice(0, 3), `천안 ${g.keyword}`].join(', '))}">
<style>${KCSS}${DIRECT_CSS}</style>${breadcrumbLd(items)}${faqLd(c.faq)}${jsonLd({ '@context': 'https://schema.org', '@type': 'Service', name, serviceType: g.keyword, url, areaServed: { '@type': 'Place', name: r.full }, provider: { '@type': 'Organization', name: '비즈헬프', url: ORIGIN + '/' }, hasOfferCatalog: { '@type': 'OfferCatalog', name: `${g.keyword} 작업`, itemListElement: c.subs.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s } })) } })}`;
  return page({ title, desc, body, canonical: url, head, accent: accentOf(g), fixbar: fixbar(ct), wide: true });
}

// ── 키워드 허브 (/<키워드>)
export function hubPage(env, g, src) {
  const ct = contactOf(env, g);
  const url = ORIGIN + kwPath(g);
  const title = `천안 ${g.keyword} | ${g.subs.slice(0, 3).join('·')} 동네별 상담 - ${SITE}`;
  const desc = `천안 ${g.keyword} 상담. ${g.subs.slice(0, 4).join('·')} — 동남구·서북구 읍·면·동별로 사진을 먼저 보고 가까운 업체와 이어 드려요.`;
  const items = [['천안 집수리', CITY], [g.keyword, kwPath(g)]];
  const ids = BA[g.slug] || [];
  const photos = ids.slice(0, 4).map((id, i) => ({ before: `/ba/${g.slug}/${id}-before.webp`, after: `/ba/${g.slug}/${id}-after.webp`, caption: `${g.subs[i % g.subs.length]} 참고 사례` }));
  const faq = faqOf(g, regionOf('cheonan'), g.subs, 0);
  const idx = regionIndex();
  const body = `${heroBlock({ img: heroOf(g), crumb: crumbs(items), h1: `천안 ${g.keyword}`, hl: g.content.headline, lead: g.content.lead || desc, ev: photos[0], ct })}${trustBlock(g, null, ct)}
<div class="wrap">
<section class="sec"><div class="sec-h"><h2>${esc(g.keyword)} 작업 항목</h2><p>눌러서 문자 상담에 담을 수 있어요.</p></div><div class="grid g3">${g.subs.map((s) => `<a class="card" href="#picker" data-pick="작업:${esc(s)}"><h3>${esc(s)}</h3><p>${esc(guideOf(g, s) ? `${guideOf(g, s).target}. ${guideOf(g, s).point}.` : s)}</p></a>`).join('')}</div></section>
${photos.length ? `<section class="sec" id="cases"><div class="sec-h"><h2>작업 전후 사례</h2><p>실제 작업 사진이에요. 손잡이를 좌우로 밀어 보세요.</p></div><div class="grid g2">${photos.map((p) => baCell(p, g.keyword)).join('')}</div></section>` : ''}
${(g.content.symptoms || []).length ? `<section class="sec"><div class="sec-h"><h2>이런 증상이라면</h2></div><div class="chips">${g.content.symptoms.map((s) => `<a href="#picker" data-pick="증상:${esc(s)}">${esc(s)}</a>`).join('')}</div></section>` : ''}
<section class="sec"><div class="sec-h"><h2>진행 순서</h2></div><ol class="steps"><li><h3>사진·증상 보내기</h3><p>문제 부위 사진과 동네, 원하는 작업을 문자로 보내 주세요.</p></li><li><h3>가능 여부 안내</h3><p>사진을 보고 방법과 일정을 먼저 알려 드려요.</p></li><li><h3>동네 업체 연결</h3><p>가까운 업체가 현장을 확인하고 비용을 안내해요.</p></li><li><h3>작업·마무리 확인</h3><p>정한 일정에 작업하고 결과를 함께 확인해요.</p></li></ol></section>
<section class="sec rgn" id="regions"><div class="sec-h"><h2>천안 동네별 ${esc(g.keyword)}</h2><p>동네를 고르면 그 지역에 맞춘 안내를 볼 수 있어요.</p></div>
<div class="chips"><a href="${esc(pagePath(g, regionOf('cheonan')))}">천안 전체</a><a href="${esc(pagePath(g, regionOf('dongnam-gu')))}">동남구</a><a href="${esc(pagePath(g, regionOf('seobuk-gu')))}">서북구</a></div>
${idx.map((x) => `<h3>${esc(x.label)} 읍·면·동</h3><div class="chips">${[...x.eupmyeon, ...x.dong].map((r) => `<a href="${esc(pagePath(g, r))}">${esc(r.name)} ${esc(g.keyword)}</a>`).join('')}</div><h3>${esc(x.label)} 법정동·생활권</h3><div class="chips">${[...x.bdong, ...x.place].map((r) => `<a href="${esc(pagePath(g, r))}">${esc(r.name)}</a>`).join('')}</div>`).join('')}</section>
<section class="sec"><div class="sec-h"><h2>자주 묻는 질문</h2></div>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
${pickerBlock(g, { areas: ['동남구', '서북구'], ct })}
<section class="sec"><div class="sec-h"><h2>다른 집수리도 찾아보세요</h2></div><div class="chips">${GROUPS.filter((x) => x.slug !== g.slug).map((x) => `<a href="${esc(kwPath(x))}">천안 ${esc(x.keyword)}</a>`).join('')}</div></section></div>
${pickerScript(ct, g.keyword, `천안 ${g.keyword}`, '', g.slug, 'cheonan')}`;
  const head = `${og(title, desc, url, heroOf(g))}${verify(env)}<style>${KCSS}</style>${breadcrumbLd(items)}${faqLd(faq)}`;
  return page({ title, desc, body, canonical: url, head, accent: accentOf(g), fixbar: fixbar(ct), wide: true });
}

// ── 지역 허브 (/area/<지역>): 그 동네의 14개 집수리
export function areaPage(env, r, src, shops = []) {
  const url = ORIGIN + areaPath(r);
  const title = `${r.name} 집수리 | ${GROUPS.slice(0, 4).map((g) => g.keyword).join('·')} - ${SITE}`;
  const desc = `${r.full} 집수리 상담 모음. 배관누수·도배·타일·샷시 등 모든 수리 항목을 ${r.name} 기준으로 안내하고 동네 업체와 이어 드려요.`;
  const items = [['천안 집수리', CITY], [`${r.name} 집수리`, areaPath(r)]];
  const near = nearOf(r);
  const seed = hashCode(r.slug);
  const body = `<section class="home-hero"><div class="wrap"><div class="crumb">${crumbs(items)}</div><span class="eyebrow">${esc(LEVEL_LABEL[r.level])} · ${esc(r.gu ? GU_LABEL[r.gu] : '천안시')}</span><h1>${esc(r.name)} 집수리, 무엇을 고칠까요?</h1>
<p class="lead">${esc(factLine(r))}</p><p class="lead" style="margin-top:6px">${esc(coverageLine(r))}</p></div></section>
<div class="wrap"><section class="sec"><div class="sec-h"><h2>${esc(r.name)}의 모든 수리 항목</h2></div><div class="grid g3 kw-grid">${rotate(GROUPS, seed).map((g) => `<a class="card pcard" href="${esc(pagePath(g, r))}"><div class="ph">${cardOf(g) ? `<img src="${esc(cardOf(g))}" alt="${esc(r.name)} ${esc(g.keyword)}" loading="lazy" decoding="async">` : ''}</div><div class="tx"><h3>${esc(r.name)} ${esc(g.keyword)}</h3><p>${esc(g.subs.slice(0, 3).join(' · '))}</p></div></a>`).join('')}</div></section>
${shopsBlock(shops, r, src)}
${directForm({ r, pageType: 'area' })}
<section class="sec"><div class="sec-h"><h2>가까운 지역</h2></div><div class="chips">${near.map((x) => `<a href="${esc(areaPath(x))}">${esc(x.name)} 집수리</a>`).join('')}</div></section></div>${directScript({ pageType: 'area', r: r.slug })}`;
  const head = `${og(title, desc, url, cardOf(GROUPS[seed % GROUPS.length]))}${verify(env)}<style>${KCSS}${DIRECT_CSS}</style>${breadcrumbLd(items)}`;
  return page({ title, desc, body, canonical: url, head, wide: true });
}

// ── 첫 화면 공통 조각(A안): 인기 수리 카드·검색 카드·신뢰 띠·세 단계·최근 작업·입점 배너
const sub3 = (g) => g.subs.slice(0, 3).join(' · ');
const popularBlock = (big, small) => `<div class="pop">${big.map((g, i) => `<a class="cd${i === 0 ? ' lg' : ''}" href="${esc(kwPath(g))}">${cardOf(g) ? `<img src="${esc(cardOf(g))}" alt="" loading="lazy" decoding="async">` : ''}<span class="t"><b>${esc(g.keyword)}</b><span>${esc(sub3(g))}</span></span></a>`).join('')}</div>
<div class="sm">${small.map((g) => `<a href="${esc(kwPath(g))}"><b>${esc(g.keyword)}</b><span>${esc(sub3(g))}</span></a>`).join('')}</div>`;

const RECENT = ['gagu-reform', 'gyedan-suri', 'veranda-sigong', 'silnae-jakeop'];
function recentBlock() {
  const items = RECENT.map((s) => groupOf(s)).filter((g) => g && (BA[g.slug] || [])[0]);
  if (!items.length) return '';
  return `<section class="sec" id="recent"><div class="sec-h"><span class="kick">RECENT WORK</span><h2>최근 작업 사진</h2><p>실제 작업 사진이에요. 눌러서 그 작업의 동네별 안내를 볼 수 있어요.</p></div>
<div class="rw">${items.map((g) => `<figure><span class="tag">AFTER</span><a href="${esc(kwPath(g))}"><img src="/ba/${esc(g.slug)}/${esc(BA[g.slug][0])}-after.webp" alt="${esc(g.keyword)} 작업 후" loading="lazy" decoding="async"></a><figcaption>${esc(g.keyword)}<span>실제 작업 사진</span></figcaption></figure>`).join('')}</div></section>`;
}

const partnerBlock = (h, p) => `<section class="partner"><div><h2>${esc(h)}</h2><p>${esc(p)}</p></div><a class="btn" href="https://m.bizhelp.kr/free">홍보페이지 만들기 (무료)</a></section>`;

const designTrust = () => `<div class="wrap"><div class="trust tr-top"><div><b>확인된 업체만</b>직접 등록 업체는 사업자·휴대폰 확인</div><div><b>동네 단위</b>읍·면·동 이름으로 바로 찾기</div><div><b>사진 먼저</b>실제 작업 사진을 보고 선택</div><div><b>견적 문의</b>동네 업체에 문의·견적 요청</div></div></div>`;

function finderBlock() {
  const kwOpts = GROUPS.map((g) => `<option value="${esc(g.slug)}">${esc(g.keyword)}</option>`).join('');
  const rOpts = REGIONS.filter((r) => r.level !== 'bdong' && r.level !== 'place').map((r) => `<option value="${esc(r.slug)}">${esc(r.level === 'si' ? '천안 전체' : r.name)}</option>`).join('')
    + `<optgroup label="법정동·생활권">${REGIONS.filter((r) => r.level === 'bdong' || r.level === 'place').map((r) => `<option value="${esc(r.slug)}">${esc(r.name)}</option>`).join('')}</optgroup>`;
  return `<div class="wrap"><form class="finder" id="finder" action="/go" method="get" onsubmit="var k=this.k.value,r=this.r.value;if(k){location.href='/'+k+(r?'/'+r:'');return false}">
<div class="fc"><label for="f-k">무엇을 고칠까요?</label><select id="f-k" name="k" required><option value="">작업 고르기</option>${kwOpts}</select></div>
<div class="fc"><label for="f-r">어느 동네인가요?</label><select id="f-r" name="r"><option value="">천안 전체</option>${rOpts}</select></div>
<button class="btn btn-ac" type="submit">업체 찾기</button></form></div>`;
}

const HOW = `<ol class="how"><li><i>01</i><b>동네 고르기</b><span>사는 도시와 읍·면·동을 선택해요.</span></li><li><i>02</i><b>작업 고르기</b><span>고칠 곳을 고르면 그 동네 기준 안내와 작업 사진이 나와요.</span></li><li><i>03</i><b>업체 연결</b><span>가까운 업체에 문의하거나 견적을 받아 보세요.</span></li></ol>`;

// ── 첫 화면(/): 모든 지역을 아우르는 메인. 지금 열린 지역은 천안(/cheonan)뿐이다.
export function mainPage(env, src) {
  const title = BRAND;
  const desc = '지역 골목상권 생활 밀착형 연계 플랫폼. 우리 동네 이름으로 집수리·생활 업체를 찾고, 가까운 동네 업체와 이어 드려요. 지금은 천안부터 열었어요.';
  const hero = cardOf(GROUPS[0]);
  const body = `<section class="dh">${hero ? `<div class="bg"><img src="${esc(hero)}" alt="" fetchpriority="high"></div>` : ''}<div class="in"><div class="ey">LOCAL BRIDGE · 천안</div><h1>우리 동네 이름으로<br>찾는 집수리</h1>
<p>어느 동네, 무엇을 고칠지만 고르세요. 그 동네 기준 안내와 실제 작업 사진을 먼저 보고 가까운 업체와 이어 드려요.</p></div></section>
${finderBlock()}${designTrust()}
<div class="wrap"><section class="sec" id="popular"><div class="sec-h"><span class="kick">POPULAR</span><h2>천안에서 많이 찾는 수리</h2><p>작업을 고르면 천안 동네별 안내와 실제 작업 사진을 볼 수 있어요.</p></div>${popularBlock(GROUPS.slice(0, 3), GROUPS.slice(3, 8))}</section>
<section class="sec" id="regions"><div class="sec-h"><span class="kick">REGION</span><h2>지역을 고르세요</h2><p>지역마다 동네 이름으로 나눈 안내와 동네 업체를 볼 수 있어요. 지금은 천안부터 열었어요.</p></div>
<div class="grid g3"><a class="card pcard" href="${esc(withSrc(CITY, src))}"><div class="ph">${hero ? `<img src="${esc(hero)}" alt="천안 집수리" loading="lazy" decoding="async">` : ''}</div><div class="tx"><h3>천안</h3><p>동남구·서북구 읍·면·동별 집수리·생활 업체</p><span class="more">천안 열기 →</span></div></a></div></section>
<section class="sec" id="how"><div class="sec-h"><span class="kick">HOW IT WORKS</span><h2>세 단계로 이어 드려요</h2></div>${HOW}</section>
${recentBlock()}
${partnerBlock('동네에서 일하시는 사장님이신가요?', '홍보 페이지를 만들고 우리 동네 이름으로 노출해 보세요.')}</div>`;
  const head = `${og(title, desc, ORIGIN + '/', cardOf(GROUPS[0]), BRAND)}${verify(env)}<style>${KCSS}</style>${jsonLd({ '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, alternateName: SITE, url: ORIGIN + '/', inLanguage: 'ko-KR' })}`;
  return page({ title, desc, body, canonical: ORIGIN + '/', head, wide: true, main: true });
}

// 실제 등록 업체 카드(가짜·예시 없음). 사진이 없으면 글자 칸으로 둔다.
function vendorCards(vendors, src) {
  return vendors.map((l) => {
    let c = {}; try { c = JSON.parse(l.content || '{}'); } catch { /* 깨진 content: 이름만 */ }
    let areas = []; try { areas = JSON.parse(l.areas || '[]'); } catch { /* 지역 없음 */ }
    const name = l.name || c.name || '';
    const photo = (Array.isArray(c.photos) ? c.photos : []).find((k) => typeof k === 'string' && /^landings\/[\w-]+\/[\w-]+\.(jpg|png|webp)$/.test(k));
    const tags = [TRADES[l.trade], ...areas.slice(0, 2).map((s) => DONG_NAME[s])].filter(Boolean);
    return `<article class="v"><div class="vp">${photo ? `<img src="/media/${esc(photo)}" alt="${esc(name)}" loading="lazy" decoding="async">` : `<span aria-hidden="true">${esc(name.slice(0, 1))}</span>`}</div><div class="vb"><b>${esc(name)}</b>${c.tagline ? `<p>${esc(c.tagline)}</p>` : ''}${tags.length ? `<div class="tg">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}<a class="btn" href="${esc(withSrc(`/p/${l.slug}`, src))}">문의하기</a></div></article>`;
  }).join('');
}

// ── 천안 첫 화면(/cheonan): 키워드·지역 포털 + 기존 기능(동네 업체, 가게 등록)
export function homePage(env, dongs, src, vendors = []) {
  const title = `천안 집수리 동네별 상담 | ${SITE}`;
  const desc = `천안 동남구·서북구 읍·면·동별 집수리 상담. 배관누수·도배·타일·샷시·욕실 방수 등 모든 수리 항목을 사진으로 먼저 보고 동네 업체와 이어 드려요.`;
  const idx = regionIndex();
  const hero = cardOf(GROUPS[0]);
  const chip = (r) => `<a href="${esc(areaPath(r))}">${esc(r.name)}</a>`;
  const MAXC = 9;
  const guPanel = (x, i) => {
    const gr = regionOf(x.gu === 'dongnam' ? 'dongnam-gu' : 'seobuk-gu');
    const list = [...x.eupmyeon, ...x.dong, ...x.bdong, ...x.place];
    return `<div class="tpanel" role="tabpanel" id="tp-${i}" aria-labelledby="tt-${i}" data-tp><h3 class="tp-h">${esc(x.label)}</h3><div class="chips"><a class="on" href="${esc(areaPath(gr))}">${esc(x.label)} 전체</a>${list.map((r, n) => (n < MAXC ? chip(r) : chip(r).replace('<a ', '<a class="x" '))).join('')}${list.length > MAXC ? `<button type="button" class="chipmore">+ 더 보기</button>` : ''}</div></div>`;
  };
  const allPanel = `<div class="tpanel" role="tabpanel" id="tp-2" aria-labelledby="tt-2" data-tp><h3 class="tp-h">천안 전체</h3><div class="chips"><a class="on" href="${esc(areaPath(regionOf('cheonan')))}">천안 전체</a><a href="${esc(areaPath(regionOf('dongnam-gu')))}">동남구</a><a href="${esc(areaPath(regionOf('seobuk-gu')))}">서북구</a></div></div>`;
  const tabNames = [idx[0].label, idx[1].label, '천안 전체'];
  const tabs = `<div class="tabs" role="tablist" aria-label="구 선택" data-tabs hidden>${tabNames.map((n, i) => `<button type="button" role="tab" id="tt-${i}" aria-controls="tp-${i}" aria-selected="${i === 0}">${esc(n)}</button>`).join('')}</div>`;
  const GU = [['dongnam', '동남구'], ['seobuk', '서북구']];
  const shops = GU.map(([gu, label]) => { const links = dongs.filter((d) => d.gu === gu).map((d) => `<li><a href="${esc(withSrc(`/d/${d.slug}`, src))}">${esc(d.name)}</a></li>`).join(''); return links ? `<div class="panel" style="margin-top:12px"><h3>${label}</h3><ul class="chips" style="margin-top:10px">${links}</ul></div>` : ''; }).join('');
  const vend = vendors.length
    ? `<div class="vend">${vendorCards(vendors, src)}</div>`
    : '<div class="card"><p style="margin-top:0">아직 직접 등록한 업체가 없어요. 위에서 고칠 곳을 고르면 가까운 동네 업체와 이어 드려요.</p></div>';
  const body = `<section class="dh sm-h">${hero ? `<div class="bg"><img src="${esc(hero)}" alt="" fetchpriority="high"></div>` : ''}<div class="in"><div class="ey">CHEONAN · 집수리</div><h1>천안 집수리,<br>우리 동네 이름으로 찾으세요</h1>
<p>무엇을 고칠지, 어느 동네인지 고르면 그 지역에 맞춘 안내가 나와요. 사진을 먼저 보고 가까운 동네 업체와 이어 드려요.</p></div></section>
${finderBlock()}
<div class="wrap"><section class="sec rgn" id="regions" style="padding-top:44px"><div class="sec-h"><span class="kick">AREA</span><h2>천안 지역별 집수리</h2><p>구를 고른 뒤 읍·면·동 이름을 누르면 그 동네 기준 안내가 나와요.</p></div>${tabs}<div class="tpanels">${guPanel(idx[0], 0)}${guPanel(idx[1], 1)}${allPanel}</div></section>
<section class="sec" id="keywords"><div class="sec-h"><span class="kick">FIX</span><h2>천안의 모든 수리 항목</h2><p>작업을 고르면 동네별 안내와 실제 작업 사진을 볼 수 있어요.</p></div>${popularBlock(GROUPS.slice(0, 3), GROUPS.slice(3))}</section>
<section class="sec" id="shops"><div class="sec-h"><span class="kick">LOCAL PARTNERS</span><h2>우리 동네 업체</h2><p>직접 홍보 페이지를 만든 동네 업체예요. 업체 페이지에서 바로 문의할 수 있어요.</p></div>${vend}
<div class="sec-h" style="margin:34px 0 0"><h3>동네별 업체 보기</h3><p>동네를 고르면 이사·청소·설치·집수리 업체를 볼 수 있어요.</p></div>${shops}</section>
${recentBlock()}
<section class="sec" id="guides"><div class="sec-h"><span class="kick">GUIDE</span><h2>맡기기 전에 읽어 보세요</h2><p>업체 찾는 순서와 견적 비교 기준을 정리했어요.</p></div><div class="grid g2">${GUIDE_LIST.map((x) => `<a class="card" href="${esc(x.path)}"><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p><span class="more">읽어 보기</span></a>`).join('')}</div></section>
${partnerBlock('천안에서 일하시는 사장님께', '홍보 페이지를 만들면 우리 동네 이름으로 노출돼요.')}</div>${TAB_SCRIPT}`;
  const items = [[BRAND, '/'], ['천안 집수리', CITY]];
  const head = `${og(title, desc, ORIGIN + CITY, cardOf(GROUPS[0]))}${verify(env)}<style>${KCSS}</style>${breadcrumbLd(items)}`;
  const fixbar = `<div class="fixbar"><a class="btn btn-ac" href="${esc(withSrc('/area/cheonan', src))}#inquiry">이 동네 견적 문의하기</a></div>`;
  return page({ title, desc, body, canonical: ORIGIN + CITY, head, wide: true, fixbar });
}

const TAB_SCRIPT = `<script>(function(){document.documentElement.classList.add('js');var tl=document.querySelector('[data-tabs]');if(!tl)return;var tabs=[].slice.call(tl.querySelectorAll('[role=tab]')),ps=[].slice.call(document.querySelectorAll('[data-tp]'));
function sel(i){tabs.forEach(function(t,j){t.setAttribute('aria-selected',j===i?'true':'false');t.tabIndex=j===i?0:-1});ps.forEach(function(p,j){p.hidden=j!==i})}
tabs.forEach(function(t,i){t.addEventListener('click',function(){sel(i)});t.addEventListener('keydown',function(e){var k=e.key;if(k==='ArrowRight'||k==='ArrowLeft'){var n=(i+(k==='ArrowRight'?1:tabs.length-1))%tabs.length;sel(n);tabs[n].focus();e.preventDefault()}})});
tl.hidden=false;sel(0);
document.querySelectorAll('.chipmore').forEach(function(b){b.addEventListener('click',function(){b.closest('[data-tp]').classList.add('open');b.hidden=true})})})();</script>`;

// 사이트맵용 전체 주소
export function allPaths() {
  const out = [CITY];
  for (const g of GROUPS) { out.push(kwPath(g)); for (const r of REGIONS) out.push(pagePath(g, r)); }
  for (const r of REGIONS) out.push(areaPath(r));
  return out;
}
export { groupOf, regionOf };
