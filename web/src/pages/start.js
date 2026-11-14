import { page, esc } from '../html.js';
import { listDongs } from '../db.js';
import { TRADES } from './dong.js';

const GU = { dongnam: '동남구', seobuk: '서북구' };

// 지금 열린 지역은 천안뿐. 지역을 먼저 고른 뒤(?r=cheonan) 등록 폼을 보여준다.
const REGION_PICK = `<h1>어느 지역에서 가게를 하세요?</h1><p class="lead">지역을 먼저 고르면 가게를 등록할 수 있어요.</p>
<div class="row" style="flex-wrap:wrap;gap:12px"><a class="btn btn-ac" href="/start?r=cheonan">천안</a>
<span class="btn btn-line" aria-disabled="true" style="opacity:.5;cursor:not-allowed">다른 지역은 준비 중이에요</span></div>`;

export async function start(env, req) {
  if (new URL(req.url).searchParams.get('r') !== 'cheonan') {
    return page({ title: '지역 선택 | 가게 등록 | 로컬브릿지', desc: '가게를 등록할 지역을 먼저 골라요.', body: REGION_PICK, noindex: true });
  }
  const dongs = await listDongs(env);
  const groups = Object.entries(GU).map(([gu, label]) =>
    `<optgroup label="${label}">${dongs.filter((d) => d.gu === gu).map((d) => `<option value="${esc(d.slug)}">${esc(d.name)}</option>`).join('')}</optgroup>`).join('');
  const trades = Object.entries(TRADES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  const body = `<h1>우리 가게 등록하기</h1><p class="lead">사업자 정보를 확인하고, 휴대폰으로 인증번호를 받아요.</p>
<style>form.f{display:grid;gap:14px;max-width:420px}form.f label{display:grid;gap:4px;font-weight:600}
form.f input,form.f select{font:inherit;padding:12px 14px;border:1px solid #ddd;border-radius:12px;background:#fff}
form.f button{font:inherit;border:0;cursor:pointer}form.f[hidden]{display:none}#msg{color:var(--accent);min-height:1.5em;margin:12px 0 0}</style>
<form id="f1" class="f">
<label>업종<select name="trade" required>${trades}</select></label>
<label>동네<select name="dong" required>${groups}</select></label>
<label>상호<input name="name" required maxlength="60" autocomplete="organization"></label>
<label>사업자등록번호<input name="bNo" required inputmode="numeric" placeholder="000-00-00000" maxlength="12"></label>
<label>개업일자<input name="startDt" required inputmode="numeric" placeholder="20200315" maxlength="8"></label>
<label>대표자 성명<input name="pNm" required maxlength="30" autocomplete="name"></label>
<label>휴대폰<input name="phone" required inputmode="tel" placeholder="01012345678" maxlength="13" autocomplete="tel"></label>
<button class="btn" type="submit">인증번호 받기</button></form>
<form id="f2" class="f" hidden><label>인증번호 6자리<input name="code" required inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code"></label>
<button class="btn" type="submit">등록하기</button></form>
<p id="msg" role="status"></p>
<p><a href="/edit">수정 주소를 잃어버리셨나요? 다시 받기</a></p>
<script>
const $=(i)=>document.getElementById(i),msg=$('msg');let claimId=0;
async function post(url,data,btn){btn.disabled=true;msg.textContent='';
try{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
const j=await r.json().catch(()=>({}));if(!r.ok){msg.textContent=j.error||'잠시 후 다시 시도해 주세요.';return null}return j}
catch{msg.textContent='네트워크가 불안정해요. 잠시 후 다시 시도해 주세요.';return null}finally{btn.disabled=false}}
$('f1').onsubmit=async(e)=>{e.preventDefault();const j=await post('/api/claim/verify',Object.fromEntries(new FormData(e.target)),e.target.querySelector('button'));
if(j){claimId=j.claimId;$('f1').hidden=true;$('f2').hidden=false;msg.textContent='문자로 보낸 인증번호를 입력해 주세요.'}};
$('f2').onsubmit=async(e)=>{e.preventDefault();const j=await post('/api/claim/confirm',{claimId,code:e.target.code.value},e.target.querySelector('button'));
if(!j)return;if(j.editUrl)location.href=j.editUrl;else{$('f2').hidden=true;msg.textContent='이미 등록된 가게예요. 운영자가 확인한 뒤 연락드려요.'}};
</script>`;
  return page({ title: '가게 등록 | 로컬브릿지AI_천안', desc: '사업자 확인과 휴대폰 인증으로 가게를 등록해요.', body, noindex: true });
}
