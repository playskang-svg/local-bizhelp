// 키워드 × 지역 페이지 본문 조립 — suriwiki의 compose-local 방식을 천안에 맞게 옮겼다.
//
// 페이지 924개(키워드 14 × 지역 66)마다 본문을 저장하지 않는다. 세 조각을 조립한다:
//   1) 지역 사실(인구·세대·관할 법정동/리·가까운 지역) — cheonan-regions.json, 지어낸 값 없음
//   2) 주거 형태(type)별 문장 풀 — 이 파일의 POOLS
//   3) 키워드 그룹의 서브키워드·증상·유형 안내 — keyword-groups.json
// 그리고 해시로 순서·선택·사진·섹션 배치를 흔든다. 규칙: 같은 (키워드, 지역)이면 언제나 같은 결과.
// 난수를 쓰면 이미 색인된 페이지가 요청마다 바뀐다.
import { BA, BULDANG_TOTAL, GU_LABEL, nearOf, regionOf, childrenOf } from './data.js';

export function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export const rotate = (arr, n) => (arr.length ? [...arr.slice(n % arr.length), ...arr.slice(0, n % arr.length)] : arr);

// ── 조사
const hasJong = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const isRieul = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8; };
export const josa = {
  eun: (w) => w + (hasJong(w) ? '은' : '는'),
  i: (w) => w + (hasJong(w) ? '이' : '가'),
  eul: (w) => w + (hasJong(w) ? '을' : '를'),
  wa: (w) => w + (hasJong(w) ? '과' : '와'),
  ro: (w) => w + (hasJong(w) && !isRieul(w) ? '으로' : '로'),
  ida: (w) => w + (hasJong(w) ? '이에요' : '예요'),
};
const fmt = (n) => Number(n).toLocaleString('ko-KR');
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

// 주거 형태별 문장 풀(해요체). 지역 이름·키워드만 끼워 넣는다 — 그 동네에 대한 새 사실을 지어내지 않는다.
// {r}=지역 이름(조사 없이), {rEun}={r}은/는, {kw}=키워드, {kwEul}, {s1}{s2}=서브키워드
const POOLS = {
  old: [
    '{rEun} 지은 지 오래된 주택과 상가 건물이 섞여 있는 천안 원도심 쪽이라, {kw} 상담 때 바탕 상태부터 사진으로 같이 보는 편이 정확해요.',
    '오래 쓴 집은 겉으로 보이는 곳보다 안쪽 상태가 작업 범위를 정하는 경우가 많아요. {s1}처럼 부분 작업으로 끝날지, 범위를 넓혀야 할지 사진으로 먼저 가려 드려요.',
    '원도심 건물은 구조와 자재가 집마다 달라서, 같은 {kw}라도 방법이 달라질 수 있어요. 멀리서 한 장, 가까이서 한두 장이면 판단에 충분해요.',
    '골목이 좁거나 계단으로 올라가는 집이라면 자재를 옮기는 방법도 미리 봐야 해서, 사진과 함께 건물 입구 쪽을 알려 주시면 도움이 돼요.',
  ],
  campus: [
    '{rEun} 대학가와 원룸·오피스텔이 많은 곳이라, 세입자와 집주인 중 누가 맡길지에 따라 {kw} 범위가 달라지는 일이 잦아요.',
    '이사 들어오기 전이나 나가기 전에 {s1}, {s2} 같은 작업을 급하게 찾는 경우가 많아서, 원하는 날짜를 함께 적어 주시면 일정부터 맞춰 봐요.',
    '원룸은 공간이 좁아 작업 동선이 중요해요. 사진에 방 전체가 한 번 보이게 찍어 주시면 준비할 자재와 시간을 더 정확히 알려 드릴 수 있어요.',
    '집주인 확인이 필요한 작업이라면 사진과 문의 내용을 그대로 전달하기 쉽게 정리해 드려요.',
  ],
  apt: [
    '{rEun} 아파트 단지가 모여 있는 주거지라, 같은 단지 안에서도 연식과 평형에 따라 {kw} 방법이 달라져요.',
    '아파트는 관리사무소에 작업 신고나 엘리베이터 보양이 필요한 경우가 있어요. 단지 이름을 함께 알려 주시면 그 부분까지 챙겨서 안내해 드려요.',
    '{s1}과 {s2}처럼 아파트에서 자주 맡기는 작업은 사진 몇 장으로도 가능 여부를 꽤 정확히 말씀드릴 수 있어요.',
    '아랫집·옆집과 맞닿은 공간이라 소음이나 물 사용이 걸리는 작업은 시간대를 미리 정해 두는 게 좋아요.',
  ],
  new: [
    '{rEun} 비교적 최근에 지어진 단지가 많은 곳이라, 하자 보수 기간이 남았는지 먼저 확인해 보시길 권해요. 기간이 지났거나 해당하지 않으면 {kw} 상담으로 이어 가면 돼요.',
    '새 집일수록 마감재가 아까워서 전체를 바꾸기보다 {s1}처럼 문제가 생긴 부분만 손보는 방법을 많이 찾으세요.',
    '입주 초기에는 {s1}, {s2} 같은 작업 문의가 몰리는 편이라, 원하는 날짜가 있다면 미리 알려 주실수록 일정 잡기가 수월해요.',
    '신축 단지는 관리 규정이 꼼꼼한 곳이 많아요. 작업 가능 시간과 보양 기준을 관리사무소에 한 번 확인해 두면 진행이 빨라져요.',
  ],
  mixed: [
    '{rEun} 아파트와 주택, 상가가 고루 섞인 곳이라 건물 형태를 먼저 알려 주시면 {kw} 방법을 더 정확히 안내할 수 있어요.',
    '같은 동네라도 아파트인지 단독·다세대인지에 따라 {s1} 작업 순서가 달라져요. 사진에 건물 바깥이 한 장 들어가면 도움이 돼요.',
    '상가나 사무실이라면 영업시간을 피해 작업하는 경우가 많아서, 가능한 시간대를 함께 적어 주세요.',
    '{s1}, {s2}처럼 범위가 작은 작업부터 큰 공사까지 사진으로 먼저 나눠서 보면 불필요한 철거를 줄일 수 있어요.',
  ],
  rural: [
    '{rEun} 천안 시내에서 떨어진 읍·면 지역이라, 사진과 정확한 위치를 먼저 받아 이동 일정까지 함께 맞춰 안내해 드려요.',
    '단독주택과 농가 주택이 많은 곳은 집마다 구조가 달라서, {kw} 상담 때 집 전체가 보이는 사진 한 장이 특히 도움이 돼요.',
    '마을 안쪽 길이 좁은 곳은 차량 진입이 어려울 수 있어서, 들어오는 길도 함께 알려 주시면 준비가 수월해요.',
    '{s1}처럼 한 번 와서 끝낼 수 있는 작업은 다른 작업과 날짜를 묶어서 진행하면 일정 잡기가 편해요.',
  ],
};

// 페이지 시드: 키워드+지역
const seedOf = (g, r) => hashCode(`${g.slug}|${r.slug}`);

// ── 지역 사실 문장(값은 모두 데이터에서)
export function factLine(r) {
  const gu = r.gu ? GU_LABEL[r.gu] : '';
  if (r.level === 'si') return `천안시는 동남구와 서북구, 4개 읍·8개 면·19개 행정동으로 이루어져 있고, ${fmt(r.households)}세대 ${fmt(r.population)}명이 살고 있어요(2024년 1월 기준).`;
  if (r.level === 'gu') return `${r.full}${hasJong(r.full) ? '은' : '는'} ${fmt(r.households)}세대 ${fmt(r.population)}명이 사는 곳으로, ${childrenOf(r.slug).filter((x) => x.level !== 'bdong').map((x) => x.name).slice(0, 6).join('·')} 등을 아우르고 있어요(2024년 1월 기준).`;
  if (r.level === 'eup' || r.level === 'myeon') return `${r.full}에는 ${r.legal.slice(0, 6).join('·')} 등 ${r.legal.length}개 리가 있고, ${fmt(r.households)}세대 ${fmt(r.population)}명이 살고 있어요(2024년 1월 기준).`;
  if (r.level === 'dong') {
    const pop = r.households
      ? `${fmt(r.households)}세대 ${fmt(r.population)}명이 사는 곳이에요(2024년 1월 기준)`
      : `불당1·2동을 합쳐 ${fmt(BULDANG_TOTAL.households)}세대 ${fmt(BULDANG_TOTAL.population)}명이 사는 곳이에요(2024년 1월 기준)`;
    return `${josa.eun(r.full)} 법정동으로 ${r.legal.join('·')}${hasJong(r.legal.at(-1)) ? '을' : '를'} 맡고 있고, ${pop}.`;
  }
  if (r.level === 'bdong') {
    const admins = (r.admins || [r.parent]).map((s) => regionOf(s)?.name).filter(Boolean);
    return `${r.name}${hasJong(r.name) ? '은' : '는'} ${gu} ${admins.join('·')}에 속한 법정동이에요. 행정복지센터 업무는 ${admins.join('·')} 쪽에서 보지만, 주소와 생활권은 ${r.name}${hasJong(r.name) ? '으로' : '로'} 많이 불러요.`;
  }
  const p = regionOf(r.parent);
  return `${r.name} 일대는 ${gu} ${p ? p.name : ''}에 걸쳐 있는 생활권이에요. 주소가 정확하지 않아도 "${r.name} 근처"라고만 알려 주셔도 상담할 수 있어요.`;
}

// 출장 범위 문장: 읍·면은 리, 행정동은 법정동, 구는 읍·면·동, 그 외는 가까운 지역
export function coverageLine(r) {
  if (r.level === 'eup' || r.level === 'myeon') return `${r.name} ${r.legal.join('·')} 어디든 사진으로 먼저 상담할 수 있어요.`;
  if (r.level === 'dong') return `${r.name} 안의 ${r.legal.join('·')} 모두 상담할 수 있어요.`;
  if (r.level === 'si' || r.level === 'gu') return `${r.name} 안의 읍·면·동 어디든 상담할 수 있어요.`;
  return `${josa.wa(r.name)} 가까운 ${nearOf(r, 5).map((x) => x.name).join('·')}까지 함께 상담하고 있어요.`;
}

const guideOf = (g, s) => (g.content.guide || {})[s] || null;

// ── 페이지 모델
export function composePage(g, r) {
  const seed = seedOf(g, r);
  const subs = rotate(g.subs, seed);
  const [s1, s2] = [subs[0], subs[1] || subs[0]];
  const vars = { r: r.name, rEun: josa.eun(r.name), kw: g.keyword, kwEul: josa.eul(g.keyword), s1, s2 };
  const pool = POOLS[r.type] || POOLS.mixed;
  const local = rotate(pool, seed >> 2).slice(0, 2).map((t) => fill(t, vars));

  const guideLines = subs.slice(0, 3).map((s) => guideOf(g, s) ? `${josa.eun(s)} ${guideOf(g, s).target}에 맞는 작업이에요. ${guideOf(g, s).point}.` : '').filter(Boolean);

  const heads = [
    `${r.name}에서 ${g.content.headline || `${g.keyword}, 어떻게 해야 할지 고민이신가요?`}`,
    `${r.name} ${g.keyword}, 사진 한 장으로 먼저 확인하세요`,
    `${r.name} ${s1}부터 ${s2}까지 한 번에 상담해요`,
  ];
  const headline = heads[seed % heads.length];

  // 사진: 그룹 사진 풀에서 이 페이지 몫 4쌍. 풀이 작으면 겹칠 수 있다.
  const ids = BA[g.slug] || [];
  const photos = rotate(ids, seed % Math.max(ids.length, 1)).slice(0, Math.min(4, ids.length)).map((id, i) => ({
    id, before: `/ba/${g.slug}/${id}-before.webp`, after: `/ba/${g.slug}/${id}-after.webp`,
    caption: `${r.name} ${subs[i % subs.length]} 참고 사례`,
  }));

  // 롱테일: 그룹에 리서치한 검색어(longtail)를 넣으면 페이지마다 다른 6개를 "{지역} {검색어}"로 배치한다.
  // 전부를 모든 페이지에 넣지 않는다 — 같은 목록이 924쪽에 반복되면 키워드 나열 페이지가 된다.
  const longtail = rotate(g.longtail || [], seed >> 5).slice(0, 6).map((t) => `${r.name} ${t}`);

  return { seed, subs, s1, s2, headline, local, guideLines, photos, longtail, fact: factLine(r), coverage: coverageLine(r), faq: faqOf(g, r, subs, seed), near: nearOf(r) };
}

export function faqOf(g, r, subs, seed) {
  const R = r.name;
  const opt = [
    [`${R} ${g.keyword}, 어떤 경우에 맡기나요?`, `${subs.slice(0, 3).map((s) => (guideOf(g, s) ? `${s}(${guideOf(g, s).target})` : s)).join(', ')} 같은 경우에 많이 맡겨요. 사진을 보내 주시면 가능 여부부터 알려 드려요.`],
    ...subs.slice(0, 4).filter((s) => guideOf(g, s)).map((s) => [`${josa.eun(s)} 어떤 작업인가요?`, `${guideOf(g, s).target}에 해당해요. ${guideOf(g, s).point}.`]),
    [`${R} 어디까지 와 주시나요?`, coverageLine(r)],
    // 리서치한 질문(faq: [[질문, 답], ...]) — {r}은 지역 이름으로 바뀐다
    ...(g.faq || []).map(([q, a]) => [q.replaceAll('{r}', R), a.replaceAll('{r}', R)]),
    [`${g.keyword} 작업은 얼마나 걸리나요?`, `${subs.slice(0, 2).map((s) => guideOf(g, s) && /\d/.test(guideOf(g, s).time) ? `${josa.eun(s)} ${guideOf(g, s).time}` : '').filter(Boolean).join(', ') || '작업 범위와 현장 상태에 따라 달라져요'}. 정확한 일정은 사진을 보고 안내해 드려요.`],
  ];
  const fixed = [
    ['비용은 어떻게 정해지나요?', '현장 상태와 작업 범위에 따라 달라서, 사진을 보고 확인한 뒤 안내해 드려요. 이 페이지에서는 금액을 미리 단정하지 않아요.'],
    ['상담은 어떻게 하나요?', '아래에서 작업과 지역을 체크한 뒤 버튼을 누르면 돼요. 문제 부위 사진이 있으면 함께 보내 주실수록 더 정확하게 안내받을 수 있어요.'],
  ];
  return [...rotate(opt, seed >> 4).slice(0, 4), ...fixed];
}

// 템플릿별 섹션 순서 + 페이지마다 인접한 두 섹션을 해시로 바꿔 배치가 모두 같지 않게 한다(첫 섹션·문자 섹션은 고정).
export const TEMPLATES = {
  consult: { accent: '#2457d6', region: ['intro', 'items', 'compare', 'symptoms', 'guide', 'shops', 'area', 'faq', 'picker'], hub: ['items', 'compare', 'symptoms', 'guide', 'steps', 'regions', 'faq', 'picker'] },
  gallery: { accent: '#0f8a7e', region: ['compare', 'intro', 'items', 'symptoms', 'shops', 'guide', 'area', 'faq', 'picker'], hub: ['compare', 'items', 'guide', 'steps', 'regions', 'faq', 'picker'] },
  guide: { accent: '#2f7d32', region: ['intro', 'guide', 'symptoms', 'items', 'compare', 'shops', 'area', 'faq', 'picker'], hub: ['guide', 'items', 'symptoms', 'steps', 'compare', 'regions', 'faq', 'picker'] },
  simple: { accent: '#e2620b', region: ['items', 'intro', 'compare', 'picker', 'shops', 'area', 'faq'], hub: ['items', 'compare', 'picker', 'regions', 'faq'] },
};
export function sectionOrder(g, seed) {
  const t = TEMPLATES[g.template] || TEMPLATES.consult;
  const list = [...t.region];
  const movable = list.map((n, i) => i).filter((i) => i > 0 && list[i] !== 'picker' && list[i + 1] && list[i + 1] !== 'picker');
  if (movable.length) { const i = movable[seed % movable.length]; [list[i], list[i + 1]] = [list[i + 1], list[i]]; }
  return list;
}
