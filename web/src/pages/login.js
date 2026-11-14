import { page, esc } from '../html.js';
import { enabled, authOn, getSession, NEXT } from '../lib/auth.js';

export const PAID_URL = 'https://m.bizhelp.kr';

// [항목, 무료, 유료] — 사업계획서 '무료형·유료형 핵심 차이' 표와 같은 내용
const ROWS = [
  ['페이지 규모', '업체 소개 중심 1페이지', '여러 페이지 (서비스·지역·사례 등)'],
  ['디자인·기능', '기본 템플릿, 필수 정보', '고급 디자인, 문의·성과 관리 등 확장 기능'],
  ['검색 최적화(SEO)', '기본 제목·설명, 색인 가능한 구조', '페이지별 키워드·구조화 데이터·사이트맵 강화'],
  ['플랫폼 광고', '비즈헬프 자체·제휴 광고가 보일 수 있어요', '광고 없음'],
  ['이용 기간', '기간 보장 없음 (약관 사유 시 고지 후 종료 가능)', '계약 기간 보장'],
  ['해지·환불', '해당 없음', '계약 조건에 따름'],
];
const ERR = { off: '로그인을 준비 중이에요. 아래 휴대폰 인증으로 등록해 주세요.', fail: '로그인에 실패했어요. 다시 시도해 주세요.' };

const list = (i) => `<ul class="pl">${ROWS.map((r) => `<li><span>${esc(r[0])}</span><b>${esc(r[i])}</b></li>`).join('')}</ul>`;

export async function loginPage(env, req) {
  const s = await getSession(req, env);
  const on = authOn(env), ps = enabled(env);
  const e = ERR[new URL(req.url).searchParams.get('e')] || '';
  const btn = (k, label) => (ps.includes(k) && on
    ? `<a class="btn sns ${k}" href="/auth/${k}">${label}로 시작하기</a>`
    : `<span class="btn sns ${k}" aria-disabled="true">${label}로 시작하기 (준비 중)</span>`);
  const free = s
    ? `<p class="who">${esc(s.n || '사장')}님, 로그인되어 있어요.</p><a class="btn btn-ac" href="${NEXT}">무료 페이지 만들기</a><a class="sub" href="/logout">로그아웃</a>`
    : `${btn('naver', '네이버')}${btn('google', '구글')}${on ? '' : `<a class="sub" href="/start?r=cheonan">휴대폰 인증으로 무료 등록하기</a>`}`;
  const body = `<style>
.pg{display:grid;gap:16px;margin-top:24px}@media(min-width:720px){.pg{grid-template-columns:1fr 1fr}}
.pc{border:1px solid var(--line);border-radius:20px;padding:24px;background:#fff;display:flex;flex-direction:column;gap:14px}
.pc.hot{border:2px solid var(--ac);box-shadow:var(--sh)}.pc h2{font-size:20px}.pc .tag{font-size:13px;font-weight:700;color:var(--ac)}
.pc .pr{font-size:34px;font-weight:800;letter-spacing:-.04em;line-height:1.1}.pc .pr small{font-size:15px;font-weight:600;color:var(--sub)}
.pc .note{font-size:13px;color:var(--sub);margin-top:-8px}
.pl{list-style:none;display:grid;gap:10px;flex:1}.pl li{display:grid;gap:2px;padding-top:10px;border-top:1px solid var(--line);font-size:15px;line-height:1.5}
.pl span{font-size:13px;color:var(--sub)}.pl b{font-weight:600}
.sns{width:100%;color:#fff}.sns.naver{background:#03a94d}.sns.google{background:#fff;color:var(--ink);border:1px solid var(--line)}
.sns[aria-disabled]{opacity:.5;cursor:not-allowed}.pc .sub{text-align:center;font-size:14px;color:var(--sub);text-decoration:underline}
.pc .who{font-weight:700}.fn{font-size:13px;color:var(--sub);margin-top:18px}.err{color:#c2410c;font-weight:600;margin-top:14px}
</style>
<span class="eyebrow">가게 페이지 만들기</span><h1>로그인하고 우리 가게 페이지를 만들어요</h1>
<p class="lead">네이버·구글로 1분 만에 시작해요. 무료로 먼저 만들고, 필요할 때 유료로 넓힐 수 있어요.</p>
${e ? `<p class="err" role="alert">${esc(e)}</p>` : ''}
<div class="pg">
<section class="pc hot" aria-label="무료형"><span class="tag">바로 시작</span><h2>무료형</h2>
<div class="pr">0원</div><p class="note">비용 없이 이용해요. 유료 전환은 강제하지 않아요.</p>${list(1)}${free}</section>
<section class="pc" aria-label="유료형"><span class="tag">운영까지 맡기기</span><h2>유료형</h2>
<div class="pr">월 10만 원<small> ~</small></div><p class="note">초기 목표 가격이에요. 최종 금액·조건은 계약 시 안내해요.</p>${list(2)}
<a class="btn btn-line" href="${PAID_URL}" rel="noopener">유료형 알아보기 (m.bizhelp.kr)</a></section>
</div>
<p class="fn">※ 'SEO 강화'는 검색 노출을 돕는 기술·콘텐츠 지원이에요. 검색 상위 노출을 보장하지 않아요. 로그인에서 받는 정보는 이름과 계정 식별값뿐이고, 연락처는 등록 때 따로 받아요. <a href="/privacy" style="text-decoration:underline">개인정보 처리방침</a></p>`;
  return page({ title: '로그인 · 무료/유료 비교 | 로컬브릿지', desc: '네이버·구글로 로그인해 가게 페이지를 만들어요. 무료형과 유료형의 차이를 한눈에 비교해요.', body, noindex: true });
}
