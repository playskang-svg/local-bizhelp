import { page, esc, jsonLd, ORIGIN, SITE, CITY } from '../html.js';
import { groupOf, regionOf, kwPath, areaPath } from '../kw/data.js';

// 사이트 컨셉 기둥(pillar)별 허브 글. 기둥: 지역 업체 찾기 / 생활 서비스 비교 (dashboard/agents/site-concepts.json)
// 외부 링크는 같은 클러스터(생활·주거·수리) 사이트로, 본문 맥락에 맞을 때만 건다(link-web).
const kw = (slug, label) => { const g = groupOf(slug); return g ? `<a href="${esc(kwPath(g))}">${esc(label || '천안 ' + g.keyword)}</a>` : esc(label || slug); };
const area = (slug, label) => { const r = regionOf(slug); return r ? `<a href="${esc(areaPath(r))}">${esc(label || r.name)}</a>` : esc(label || slug); };
const ext = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;
const faqLd = (qa) => jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = (qa) => qa.map(([q, a]) => `<details class="panel" style="margin-top:10px"><summary><b>${esc(q)}</b></summary><p style="margin-top:8px">${esc(a)}</p></details>`).join('');

const GUIDES = {
  'find-local-pro': {
    title: '천안 동네 업체 찾는 법: 이사·청소·설치·집수리 맡기기 전 확인할 것',
    h1: '천안 동네 업체,<br>이렇게 찾으면 덜 헤매요',
    desc: '천안에서 이사·청소·설치·집수리 업체를 찾을 때 동네 이름으로 좁히는 법, 사진과 견적으로 거르는 기준, 연락 전에 정리할 내용을 한곳에 모았어요.',
    updated: '2026-11-14',
    body: () => `<section class="panel facts"><b>먼저 답부터:</b> 천안은 동남구와 서북구로 나뉘고 읍·면·동만 30곳이 넘어요. "천안 도배"보다 "불당동 도배"처럼 <b>동네 이름 + 작업</b>으로 찾으면 실제로 오는 업체만 남아요. 그다음 작업 사진, 견적 항목, 연락 응답 속도 세 가지로 거르면 돼요.</section>
<h2 style="margin-top:36px">1. 동네 이름으로 좁히기</h2>
<div class="prose"><p>같은 천안이라도 ${area('dongnam-gu', '동남구')}의 읍·면 지역과 ${area('seobuk-gu', '서북구')} 신도심은 출장비와 일정이 꽤 달라요. 내 동네 페이지에서 시작하면 그 지역에 자주 가는 업체와 작업을 먼저 볼 수 있어요. 전체 목록은 ${area('cheonan', '천안 전체 지역')}에 있어요.</p>
<p>소상공인시장진흥공단 상가정보(2026년 11월 조회)로 보면 천안에는 건물 청소 435곳, 인테리어 디자인 300곳, 가전 수리 245곳, 철물점 179곳, 소독·방제 73곳이 등록돼 있어요. 업체는 많지만 내 동네까지 오는 곳은 그중 일부라서, 동네부터 정하는 게 시간을 아끼는 방법이에요.</p></div>
<h2 style="margin-top:36px">2. 작업부터 정하기</h2>
<div class="prose"><p>"집이 좀 이상해요"보다 "욕실 실리콘에 곰팡이"처럼 작업 이름을 정해야 견적이 정확해져요. 자주 찾는 작업은 ${kw('baegwan-nusu')}, ${kw('dobae-jangpan', '천안 도배·장판')}, ${kw('yokshil-bangsu', '천안 욕실 시공')}, ${kw('syasi-gyoche', '천안 창틀 샷시')}, ${kw('hyeongwanmun-gyoche')}이에요. 문이 안 닫히거나 틀어졌다면 ${ext('https://suriwiki.com/door-repair', '수리위키 문 수리 지역별 가이드')}에서 증상별 사례를 먼저 보고 오면 설명이 쉬워요.</p></div>
<h2 style="margin-top:36px">3. 사진·견적·응답으로 거르기</h2>
<div class="prose"><ul style="padding-left:20px">
<li><b>작업 전후 사진</b>이 실제 현장인지 봐요. 같은 사진이 여러 업체에 돌면 걸러요.</li>
<li><b>견적 항목</b>이 자재비·인건비·출장비·폐기물로 나뉘어 있는지 봐요. "일식 얼마"만 있으면 나중에 추가 비용이 붙기 쉬워요.</li>
<li><b>응답 속도</b>도 기준이에요. 문의 뒤 하루 안에 연락이 오는 곳이 일정도 잘 지키는 편이에요.</li></ul></div>
<h2 style="margin-top:36px">4. 연락 전에 정리할 것</h2>
<div class="prose"><p>동네, 작업 이름, 사진 2~3장, 원하는 날짜만 있으면 대부분 첫 연락에서 대략적인 금액이 나와요. 이사를 앞두고 있다면 ${ext('https://isatips.adbles.com/articles/moving-preparation-checklist', '이사 준비 체크리스트(30일 전부터 당일까지)')}에 맞춰 청소·설치 일정을 같이 잡으면 겹치지 않아요.</p>
<p>집 말고 차가 문제라면 따로 봐야 해요. 아침에 시동이 안 걸리면 ${ext('https://batterycall.kr/guides/car-battery-discharge-first-response', '배터리 방전 때 먼저 확인할 6가지')}부터 확인해 보세요.</p></div>
<h2 style="margin-top:36px">자주 묻는 질문</h2>`,
    faq: [
      ['천안에서 집수리 업체는 어디서 찾는 게 빠른가요?', '동네 이름과 작업 이름을 같이 넣어 찾는 게 빨라요. 로컬브릿지AI_천안에서는 작업과 동네를 고르면 그 지역 안내와 업체를 바로 볼 수 있어요.'],
      ['견적은 몇 곳에서 받는 게 좋나요?', '보통 2~3곳이면 충분해요. 항목이 나뉜 견적끼리 비교해야 차이가 보여요.'],
      ['읍·면 지역도 업체가 오나요?', '와요. 다만 출장비가 붙거나 일정이 하루 이틀 밀릴 수 있어서 연락할 때 정확한 동네를 먼저 말하는 게 좋아요.'],
    ],
  },
  'service-compare': {
    title: '천안 생활 서비스 비교: 이사·입주청소·에어컨 설치·집수리 견적 보는 기준',
    h1: '천안 생활 서비스,<br>무엇을 비교해야 할까요',
    desc: '천안에서 이사, 입주청소, 에어컨·가전 설치, 집수리 견적을 비교할 때 볼 항목과 추가 비용이 붙는 지점, 일정 잡는 순서를 서비스별로 정리했어요.',
    updated: '2026-11-14',
    body: () => `<section class="panel facts"><b>먼저 답부터:</b> 가격만 보면 실패하기 쉬워요. 서비스마다 <b>추가 비용이 붙는 지점</b>이 달라서, 그 항목이 견적에 들어 있는지부터 비교하세요. 이사 → 입주청소 → 설치 → 수리 순서로 일정을 잡으면 다시 부를 일이 줄어요.</section>
<h2 style="margin-top:36px">서비스별 비교 기준</h2>
<div style="overflow-x:auto;margin-top:14px"><table style="width:100%;border-collapse:collapse;font-size:15.5px">
<thead><tr style="border-bottom:2px solid var(--line);text-align:left"><th style="padding:10px 8px">서비스</th><th style="padding:10px 8px">꼭 볼 항목</th><th style="padding:10px 8px">추가 비용이 붙는 곳</th></tr></thead>
<tbody>
<tr style="border-bottom:1px solid var(--line)"><td style="padding:10px 8px"><b>이사</b></td><td style="padding:10px 8px">짐 양(톤), 사다리차, 포장 범위</td><td style="padding:10px 8px">엘리베이터 없음, 손 없는 날, 에어컨 탈착</td></tr>
<tr style="border-bottom:1px solid var(--line)"><td style="padding:10px 8px"><b>입주·이사청소</b></td><td style="padding:10px 8px">평수, 베란다·창틀 포함 여부</td><td style="padding:10px 8px">새집증후군, 스티커 제거, 곰팡이</td></tr>
<tr style="border-bottom:1px solid var(--line)"><td style="padding:10px 8px"><b>설치</b></td><td style="padding:10px 8px">배관 길이, 타공, 거치대</td><td style="padding:10px 8px">배관 연장, 실외기 앵글, 벽 재질</td></tr>
<tr><td style="padding:10px 8px"><b>집수리</b></td><td style="padding:10px 8px">자재 등급, 면적, 철거 범위</td><td style="padding:10px 8px">폐기물, 바탕 보수, 야간·주말</td></tr>
</tbody></table></div>
<h2 style="margin-top:36px">1. 이사 견적 비교</h2>
<div class="prose"><p>같은 짐이라도 방문 견적과 전화 견적 차이가 커요. 비교할 때 볼 항목은 ${ext('https://isatips.adbles.com/articles/moving-company-quote-comparison', '포장이사 견적 받을 때 확인할 7가지')}에 정리돼 있어요. 이사 날짜가 정해지면 청소와 설치 일정을 그 뒤로 붙이세요.</p></div>
<h2 style="margin-top:36px">2. 청소·설치 비교</h2>
<div class="prose"><p>입주청소는 평수만 같으면 비슷해 보이지만 창틀·베란다·주방 후드가 들어가는지에 따라 결과가 달라요. 에어컨이나 ${kw('robot-jikbaesu', '로봇청소기 직배수 설치')}처럼 배관이 걸린 작업은 현장 사진을 보내고 받은 견적끼리만 비교해야 정확해요.</p></div>
<h2 style="margin-top:36px">3. 집수리 비교</h2>
<div class="prose"><p>${kw('tail-sigong', '천안 타일 시공')}, ${kw('dobae-jangpan', '천안 도배·장판')}처럼 면적으로 값이 정해지는 작업은 평당 단가와 철거·바탕 보수가 따로인지 봐요. 누수처럼 원인을 찾아야 하는 작업은 ${kw('baegwan-nusu', '천안 배관 누수')} 페이지의 사례를 보고 "탐지비 포함인지" 꼭 물어보세요. 작업별 사례를 더 보고 싶다면 ${ext('https://suriwiki.com/', '수리위키')}에 항목별로 모여 있어요.</p></div>
<h2 style="margin-top:36px">4. 이사 온 뒤 동네 알아보기</h2>
<div class="prose"><p>집이 정리되면 동네도 익혀야죠. 천안 생활권별 병원·미용·운동 같은 정보는 ${ext('https://cheonan.noluga.com/life', '천안놀러가 동네 생활 가이드')}에서 볼 수 있어요. 집 근처 업체는 ${area('cheonan', '천안 지역별 페이지')}에서 동네를 골라 찾으면 돼요.</p></div>
<h2 style="margin-top:36px">자주 묻는 질문</h2>`,
    faq: [
      ['이사·청소·설치는 어떤 순서로 잡나요?', '이사 → 입주청소 → 가전 설치 → 남은 수리 순서가 좋아요. 청소 전에 설치하면 먼지가 다시 쌓이고, 수리를 먼저 하면 이사 때 다시 상할 수 있어요.'],
      ['견적이 너무 싸면 피해야 하나요?', '싼 것보다 항목이 빠진 게 문제예요. 폐기물·출장비·자재 등급이 들어 있는지 확인하고, 빠졌다면 추가될 금액을 미리 물어보세요.'],
      ['천안 읍·면 지역은 비용이 더 드나요?', '출장비가 붙는 경우가 많아요. 견적을 받을 때 정확한 동네와 건물 형태(아파트·주택·상가)를 같이 알려 주면 차이가 줄어요.'],
    ],
  },
};

export const GUIDE_PATHS = Object.keys(GUIDES).map((s) => `/guide/${s}`);
export const GUIDE_LIST = Object.entries(GUIDES).map(([slug, g]) => ({ path: `/guide/${slug}`, title: g.title, desc: g.desc }));

export function guidePage(slug) {
  const g = GUIDES[slug];
  if (!g) return null;
  const url = `${ORIGIN}/guide/${slug}`;
  const head = `<meta property="og:type" content="article"><meta property="og:site_name" content="${esc(SITE)}"><meta property="og:title" content="${esc(g.title)}"><meta property="og:description" content="${esc(g.desc)}"><meta property="og:url" content="${esc(url)}">`
    + jsonLd({ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.desc, dateModified: g.updated, datePublished: g.updated, mainEntityOfPage: url, publisher: { '@type': 'Organization', name: '비즈헬프' } })
    + jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['로컬브릿지', '/'], ['천안 집수리', CITY], [g.title, `/guide/${slug}`]].map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + p })) })
    + faqLd(g.faq);
  const other = GUIDE_LIST.filter((x) => x.path !== `/guide/${slug}`).map((x) => `<a class="card" href="${esc(x.path)}" style="margin-top:12px"><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p><span class="more">읽어 보기</span></a>`).join('');
  const body = `<div class="crumb"><a href="/">로컬브릿지</a><span>›</span><a href="${CITY}">천안</a><span>›</span>가이드</div>
<span class="eyebrow">천안 생활 가이드 · ${esc(g.updated)} 업데이트</span><h1>${g.h1}</h1><p class="lead">${esc(g.desc)}</p>
<div style="margin-top:28px">${g.body()}${faqHtml(g.faq)}</div>
<div class="row"><a class="btn btn-ac" href="${CITY}">천안 동네별로 찾기</a></div>
<h2 style="margin-top:44px">함께 보면 좋은 글</h2>${other}`;
  return page({ title: `${g.title} | ${SITE}`, desc: g.desc, body, canonical: url, head });
}
