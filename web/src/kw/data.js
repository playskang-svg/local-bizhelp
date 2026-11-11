// 키워드 × 천안 지역 페이지의 데이터. 원본은 저장소 파일(shared/)이다 — 빌드·DB 없이 워커에 묶여 들어간다.
//  keyword-groups.json : suriwiki 관리센터에서 가져온 14개 키워드 그룹 (scripts/import-suriwiki.mjs)
//  cheonan-regions.json: 천안 시·구·읍·면·행정동·법정동·생활권 지명 (scripts/build-regions.mjs)
//  ba-photos.json      : 그룹별 실제 작업 전/후 사진 id (web/public/ba/<slug>/<id>-before|after.webp)
import groupsJson from '../../../shared/keyword-groups.json' with { type: 'json' };
import regionsJson from '../../../shared/cheonan-regions.json' with { type: 'json' };
import baJson from '../../../shared/ba-photos.json' with { type: 'json' };
import siteImagesJson from '../../../shared/site-images.json' with { type: 'json' };

export const GROUPS = groupsJson;
export const REGIONS = regionsJson.regions;
export const BULDANG_TOTAL = regionsJson.buldangTotal;
export const BA = baJson;
// suriwiki 사이트 이미지(web/public/img/<slug>/) 파일 목록 — 있는 것만 쓴다
export const HERO = siteImagesJson;

const G = new Map(GROUPS.map((g) => [g.slug, g]));
const R = new Map(REGIONS.map((r) => [r.slug, r]));
export const groupOf = (slug) => G.get(slug) || null;
export const regionOf = (slug) => R.get(slug) || null;

export const LEVEL_LABEL = { si: '시', gu: '구', eup: '읍', myeon: '면', dong: '행정동', bdong: '법정동', place: '생활권' };
export const GU_LABEL = { dongnam: '동남구', seobuk: '서북구' };

export const childrenOf = (slug) => REGIONS.filter((r) => r.parent === slug);

// 가까운 지역: 위 단위 → 같은 위 단위를 둔 형제 → 아래 단위. 자기 자신은 뺀다.
export function nearOf(r, max = 12) {
  const out = [];
  const add = (x) => { if (x && x.slug !== r.slug && !out.includes(x)) out.push(x); };
  add(regionOf(r.parent));
  for (const x of childrenOf(r.slug)) add(x);
  for (const x of REGIONS.filter((y) => y.parent === r.parent && y.level === r.level)) add(x);
  if (r.level === 'bdong') for (const a of r.admins || []) add(regionOf(a));
  return out.slice(0, max);
}

// 사이트 경로
export const kwPath = (g) => `/${g.slug}`;
export const pagePath = (g, r) => `/${g.slug}/${r.slug}`;
export const areaPath = (r) => `/area/${r.slug}`;

// 지도·목록용: 구별 → 읍·면 / 행정동 / 법정동 / 생활권
export function regionIndex() {
  return ['dongnam', 'seobuk'].map((gu) => ({
    gu, label: GU_LABEL[gu],
    eupmyeon: REGIONS.filter((r) => r.gu === gu && (r.level === 'eup' || r.level === 'myeon')),
    dong: REGIONS.filter((r) => r.gu === gu && r.level === 'dong'),
    bdong: REGIONS.filter((r) => r.gu === gu && r.level === 'bdong'),
    place: REGIONS.filter((r) => r.gu === gu && r.level === 'place'),
  }));
}
