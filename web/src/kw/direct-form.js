// 키워드×지역(/<키워드>/<지역>)·지역 허브(/area/<지역>) 페이지에만 붙는 것:
//  ① GA4 이벤트 quote_click · sms_click · call_click · route_click · lead_view · lead_submit, src/UTM 수신
//  ② 직접 문의 폼(동·작업·희망일·휴대폰·개인정보 동의) → POST /api/direct-inquiry
// 휴대폰 번호·희망일 같은 입력값은 GA 이벤트와 로그에 넣지 않는다(이벤트에는 작업·동네 슬러그와 유입 경로만).
// 효과 측정 중인 키워드 허브(/<키워드>)·/cheonan·가이드는 이 파일을 쓰지 않는다(2주 동결).
import { esc } from '../html.js';
import { GROUPS, REGIONS, regionOf } from './data.js';
import { DIRECT_REGIONS, DIRECT_OTHER, DIRECT_UNKNOWN } from '../lib/direct.js';

export const DIRECT_CSS = `.dq{border:1px solid var(--line);border-radius:var(--r);padding:28px 22px;box-shadow:var(--sh);background:#fff}
.dq .why{margin-bottom:18px}.dq h2{margin-bottom:6px}
.dq .f{display:grid;gap:14px;margin-top:18px}@media(min-width:640px){.dq .f{grid-template-columns:1fr 1fr}.dq .f .full{grid-column:1/-1}}
.dq label.l{display:block;font-size:14px;font-weight:700;color:var(--sub);margin-bottom:6px}
.dq select,.dq input[type=date],.dq input[type=tel]{width:100%;min-height:52px;border:1px solid var(--line);border-radius:var(--r2);padding:0 14px;font:inherit;font-size:16px;background:#fff;color:var(--ink)}
.dq .ag{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.6}.dq .ag input{width:20px;height:20px;margin-top:4px;flex:none}
.dq .notice{background:var(--soft);border-radius:var(--r2);padding:14px 16px;font-size:14px;color:var(--sub);line-height:1.7}.dq .notice a{text-decoration:underline;text-underline-offset:3px}
.dq .btn{width:100%}.dq .msg{margin-top:12px;font-size:15px;font-weight:600}.dq .msg.err{color:#c0262d}.dq .msg.ok{color:var(--ac)}
.dq .hp{position:absolute;left:-9999px;height:0;overflow:hidden}`;

const WORK = (g) => [...GROUPS.map((x) => `<option value="${esc(x.slug)}"${g && x.slug === g.slug ? ' selected' : ''}>${esc(x.keyword)}</option>`), `<option value="${DIRECT_UNKNOWN}">잘 모르겠어요</option>`].join('');

// 지금 보는 지역이 읍·면·동이면 그대로, 법정동·생활권이면 위 행정동(admins)을 미리 고른다
function preRegion(r) {
  if (!r) return '';
  if (DIRECT_REGIONS.some((x) => x.slug === r.slug)) return r.slug;
  for (const a of r.admins || []) if (DIRECT_REGIONS.some((x) => x.slug === a)) return a;
  const p = regionOf(r.parent);
  return p && DIRECT_REGIONS.some((x) => x.slug === p.slug) ? p.slug : '';
}

export function directForm({ g = null, r = null, pageType }) {
  const pre = preRegion(r);
  const opts = [`<option value=""${pre ? '' : ' selected'}>동네를 골라 주세요</option>`,
    ...DIRECT_REGIONS.map((x) => `<option value="${esc(x.slug)}"${x.slug === pre ? ' selected' : ''}>${esc(x.name)}</option>`),
    `<option value="${DIRECT_OTHER}">천안 다른 지역</option>`].join('');
  return `<section class="sec" id="inquiry"><form class="dq" id="dq" method="post" action="/api/direct-inquiry" novalidate data-clarity-mask="true">
<div class="why"><b>견적 링크 말고, 동네 문의로 남기기</b>동네와 작업, 연락받을 번호만 남겨 주세요. 지금은 이 동네에 연결할 업체를 여는 중이라 업체에 자동으로 전달되지 않고 접수 기록으로 보관돼요.</div>
<h2>직접 문의 남기기</h2>
<div class="f">
<div><label class="l" for="dq-region">동네</label><select id="dq-region" name="region" required>${opts}</select></div>
<div><label class="l" for="dq-group">작업</label><select id="dq-group" name="group" required>${WORK(g)}</select></div>
<div><label class="l" for="dq-date">희망일 (선택)</label><input id="dq-date" name="wishDate" type="date"></div>
<div><label class="l" for="dq-phone">휴대폰 번호</label><input id="dq-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="13" placeholder="010-0000-0000" required data-clarity-mask="true"></div>
<div class="hp" aria-hidden="true"><label>비워 두세요<input name="hp" tabindex="-1" autocomplete="off"></label></div>
<div class="full notice"><b>개인정보 수집·이용 안내</b><br>수집 항목: 휴대폰 번호, 동네, 작업, 희망일(선택), 유입 경로 값 · 이용 목적: 동네 업체 연결을 위한 문의 접수 · 보관: 접수 1년 뒤 파기 · 동의하지 않아도 사이트는 쓸 수 있지만 문의 접수는 되지 않아요. 자세한 내용은 <a href="/privacy" target="_blank" rel="noopener">개인정보 처리방침</a>을 확인해 주세요.</div>
<div class="full"><label class="ag"><input type="checkbox" name="consent" id="dq-consent" value="1" required><span>개인정보 수집·이용에 동의합니다. (필수)</span></label></div>
<input type="hidden" name="page" value="${esc(location_path(pageType, g, r))}">
<div class="full"><button class="btn btn-ac" type="submit" id="dq-go">문의 접수하기</button><div class="msg" id="dq-msg" role="status" aria-live="polite"></div></div>
</div></form></section>`;
}

const location_path = (pageType, g, r) => (pageType === 'area' ? `/area/${r.slug}` : `/${g.slug}/${r.slug}`);

// 추적 + 폼 전송 스크립트 (인라인). PT=page_type(kw_region|area)
export const directScript = ({ pageType, g = '', r = '' }) => `<script>(function(){
var PT=${JSON.stringify(pageType)},G=${JSON.stringify(g)},R=${JSON.stringify(r)},K=['src','utm_source','utm_medium','utm_campaign','utm_content'],OK=/^[A-Za-z0-9_.-]{1,60}$/;
function ga(n,p){try{if(window.gtag)gtag('event',n,p||{})}catch(e){}}
var q=new URLSearchParams(location.search),A={},fresh=false;
try{var s=JSON.parse(sessionStorage.getItem('lb_attr')||'{}');K.forEach(function(k){if(s[k]&&OK.test(s[k]))A[k]=s[k]})}catch(e){}
K.forEach(function(k){var v=q.get(k);if(v&&OK.test(v)){A[k]=v;fresh=true}});
try{sessionStorage.setItem('lb_attr',JSON.stringify(A))}catch(e){}
function base(x){var o={page_type:PT,kw_group:G,kw_region:R,entry_src:A.src||'',entry_source:A.utm_source||'',entry_medium:A.utm_medium||'',entry_campaign:A.utm_campaign||'',entry_content:A.utm_content||''};for(var k in x)o[k]=x[k];return o}
if(fresh)ga('lb_entry',base({}));
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';
if(a.id==='sms-go'){ga(h.indexOf('sms:')===0?'sms_click':'quote_click',base({transport_type:'beacon'}));return}
if(h.indexOf('tel:')===0){ga('call_click',base({transport_type:'beacon'}));return}
if(h.charAt(0)==='#'||h.indexOf('sms:')===0)return;
var u;try{u=new URL(h,location.href)}catch(x){return}
if(u.origin===location.origin){if(u.pathname!==location.pathname)ga('route_click',base({link_type:'internal',to_path:u.pathname.slice(0,100),transport_type:'beacon'}))}
else ga('route_click',base({link_type:u.hostname==='m.bizhelp.kr'?'supply':'outbound',to_host:u.hostname,transport_type:'beacon'}))},true);
var f=document.getElementById('dq');if(!f)return;
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(en){if(en[0].isIntersecting){ga('lead_view',base({}));io.disconnect()}},{threshold:.4});io.observe(f)}
var d=f.querySelector('[name=wishDate]');if(d){var t=new Date(Date.now()+9*36e5).toISOString().slice(0,10);d.min=t}
var ph=f.querySelector('[name=phone]');ph.addEventListener('input',function(){var v=ph.value.replace(/\\D/g,'').slice(0,11);ph.value=v.length>7?v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7):v.length>3?v.slice(0,3)+'-'+v.slice(3):v});
var msg=document.getElementById('dq-msg'),go=document.getElementById('dq-go');
function say(t,c){msg.textContent=t;msg.className='msg '+(c||'')}
f.addEventListener('submit',function(e){e.preventDefault();
var fd=new FormData(f),b={region:fd.get('region')||'',group:fd.get('group')||'',wishDate:fd.get('wishDate')||'',phone:fd.get('phone')||'',consent:!!fd.get('consent'),hp:fd.get('hp')||'',page:fd.get('page')||'',src:A.src||'',utm_source:A.utm_source||'',utm_medium:A.utm_medium||'',utm_campaign:A.utm_campaign||'',utm_content:A.utm_content||''};
if(!b.region)return say('동네를 골라 주세요.','err');
if(!/^01[016789]\\d{7,8}$/.test(String(b.phone).replace(/\\D/g,'')))return say('휴대폰 번호를 다시 확인해 주세요.','err');
if(!b.consent)return say('개인정보 수집·이용에 동의해 주세요.','err');
go.disabled=true;say('접수하는 중이에요…');
fetch('/api/direct-inquiry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json().catch(function(){return{ok:false}}).then(function(j){return[r.ok,j]})}).then(function(x){
if(x[0]&&x[1].ok){ga('lead_submit',base({form_group:b.group,form_region:b.region,has_wish_date:b.wishDate?1:0}));f.reset();say('접수됐어요. 지금은 접수 기록으로 보관되고, 업체에 자동으로 전달되지는 않아요.','ok')}
else{say((x[1]&&x[1].message)||'접수하지 못했어요. 잠시 후 다시 시도해 주세요.','err');go.disabled=false}
}).catch(function(){say('접수하지 못했어요. 잠시 후 다시 시도해 주세요.','err');go.disabled=false})});
})();</script>`;
