// 천안 지역 카탈로그 생성 → shared/cheonan-regions.json
// 원본: 위키백과 「천안시의 행정 구역」(2024-01-01 기준 표, 2026-11-11 조회). 인구·세대·법정동/리는 그 표의 값 그대로다.
// 지어낸 사실을 넣지 않는다. type 은 문장 풀에서 어떤 변주를 고를지만 정하는 주거 형태 분류다.
//   old=구도심 · campus=대학가·원룸 · apt=아파트 밀집 · new=신도시·택지 · mixed=주거·상가·공장 혼재 · rural=읍·면
// 단위: si(시) gu(구) eup myeon dong(행정동) bdong(법정동) place(생활권 지명)
// 사용: node scripts/build-regions.mjs
import fs from 'node:fs';

const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
export function romanize(text) {
  let out = '';
  for (const ch of String(text)) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) { const n = c - 0xac00; out += CHO[Math.floor(n / 588)] + JUNG[Math.floor((n % 588) / 28)] + JONG[n % 28]; }
    else if (/[a-zA-Z0-9]/.test(ch)) out += ch.toLowerCase();
    else out += '-';
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '');
}
// "원성1동" → "wonseong-1-dong", "목천읍" → "mokcheon-eup", "두정역" → "dujeong-yeok"
const slugOf = (name) => {
  const m = name.match(/^(.+?)(\d?)(동|읍|면|구|역|지구|시)$/);
  if (!m) return romanize(name);
  return [romanize(m[1]), m[2], romanize(m[3])].filter(Boolean).join('-');
};

// [이름, 구, 단위, 유형, 인구, 세대, 관할 법정동·리]
const ADMIN = [
  ['목천읍', 'dongnam', 'eup', 'rural', 24800, 11039, '서리 동리 교촌리 남화리 동평리 운전리 신계리 천정리 교천리 지산리 서흥리 덕전리 송전리 석천리 응원리 삼성리 도장리 소사리'],
  ['풍세면', 'dongnam', 'myeon', 'rural', 4409, 2119, '풍서리 보성리 가송리 두남리 미죽리 남관리 삼태리 용정리'],
  ['광덕면', 'dongnam', 'myeon', 'rural', 4471, 2349, '신흥리 대덕리 매당리 무학리 광덕리 보산원리 지장리 신덕리 행정리 대평리 원덕리'],
  ['북면', 'dongnam', 'myeon', 'rural', 4526, 2412, '연춘리 상동리 용암리 은지리 매송리 명덕리 오곡리 사담리 전곡리 양곡리 납안리 운용리 대평리'],
  ['성남면', 'dongnam', 'myeon', 'rural', 3777, 1663, '용원리 신사리 대화리 화성리 석곡리 대정리 대흥리 신덕리 봉양리'],
  ['수신면', 'dongnam', 'myeon', 'rural', 2709, 1302, '속창리 신풍리 장산리 해정리 발산리 백자리'],
  ['병천면', 'dongnam', 'myeon', 'rural', 6440, 3363, '병천리 가전리 탑원리 용두리 송정리 도원리 관성리 매성리 봉항리'],
  ['동면', 'dongnam', 'myeon', 'rural', 2374, 1170, '화계리 광덕리 구도리 송연리 동산리 행암리 덕성리 죽계리 장송리 수남리 화덕리'],
  ['중앙동', 'dongnam', 'dong', 'old', 5761, 3205, '대흥동 오룡동 사직동 영성동'],
  ['문성동', 'dongnam', 'dong', 'old', 3889, 2259, '문화동 성황동'],
  ['원성1동', 'dongnam', 'dong', 'old', 9033, 4259, '원성동 유량동'],
  ['원성2동', 'dongnam', 'dong', 'old', 9675, 4875, '원성동'],
  ['봉명동', 'dongnam', 'dong', 'apt', 18690, 9106, '봉명동 쌍용동'],
  ['일봉동', 'dongnam', 'dong', 'apt', 24131, 8890, '다가동 용곡동'],
  ['신방동', 'dongnam', 'dong', 'apt', 45671, 18345, '신방동 용곡동'],
  ['청룡동', 'dongnam', 'dong', 'mixed', 56531, 21515, '청수동 청당동 구성동 삼룡동 구룡동'],
  ['신안동', 'dongnam', 'dong', 'campus', 39030, 17715, '신부동 안서동'],
  ['성환읍', 'seobuk', 'eup', 'rural', 26436, 11267, '성환리 성월리 매주리 율금리 왕림리 신방리 송덕리 우신리 어룡리 복모리 신가리 와룡리 대홍리 수향리 안궁리 양령리 도하리 학정리'],
  ['성거읍', 'seobuk', 'eup', 'rural', 22670, 9594, '천흥리 송남리 오목리 오색당리 저리 모전리 삼곡리 정촌리 문덕리 석교리 요방리 소우리 신월리'],
  ['직산읍', 'seobuk', 'eup', 'rural', 21155, 9364, '군동리 군서리 남산리 판정리 수헐리 삼은리 상덕리 부송리 모시리 자은가리 양당리 신갈리 마정리 석곡리'],
  ['입장면', 'seobuk', 'myeon', 'rural', 9664, 4452, '하장리 상장리 기로리 도림리 양대리 홍천리 호당리 시장리 효계리 신덕리 신두리 용정리 흑암리 산정리 연곡리 가산리 유리 독정리'],
  ['성정1동', 'seobuk', 'dong', 'apt', 16671, 8838, '성정동 와촌동'],
  ['성정2동', 'seobuk', 'dong', 'apt', 26487, 17001, '성정동'],
  ['쌍용1동', 'seobuk', 'dong', 'apt', 14197, 6218, '쌍용동'],
  ['쌍용2동', 'seobuk', 'dong', 'apt', 38400, 14580, '쌍용동'],
  ['쌍용3동', 'seobuk', 'dong', 'apt', 19185, 7984, '쌍용동'],
  ['백석동', 'seobuk', 'dong', 'apt', 41058, 14305, '백석동'],
  ['불당1동', 'seobuk', 'dong', 'new', null, null, '불당동'],
  ['불당2동', 'seobuk', 'dong', 'new', null, null, '불당동'],
  ['부성1동', 'seobuk', 'dong', 'mixed', 46747, 22337, '두정동 부대동 신당동 업성동'],
  ['부성2동', 'seobuk', 'dong', 'apt', 58079, 23989, '두정동 성성동 차암동'],
];
// 불당1·2동은 표에서 합계(70,330명·25,910세대)만 있다 — 동별로 나누지 않는다.
const BULDANG_TOTAL = { population: 70330, households: 25910 };

// 법정동 유형(행정동과 다른 경우만)
const BDONG_TYPE = { 청수동: 'new', 청당동: 'new', 성성동: 'new', 신부동: 'campus', 안서동: 'campus', 두정동: 'apt', 차암동: 'mixed', 업성동: 'mixed', 부대동: 'mixed', 신당동: 'mixed' };
// 생활권 지명: [이름, 속한 법정동, 유형]
const PLACES = [
  ['신불당', '불당동', 'new', 'sin-buldang'],
  ['두정역', '두정동', 'apt'],
  ['천안역', '대흥동', 'old'],
  ['천안터미널', '신부동', 'campus', 'cheonan-terminal'],
  ['청수지구', '청수동', 'new'],
];

const GU = { dongnam: '동남구', seobuk: '서북구' };
const regions = [
  { slug: 'cheonan', name: '천안', full: '천안시', level: 'si', gu: null, parent: null, type: 'mixed', population: 676996, households: 291425, legal: [] },
  { slug: 'dongnam-gu', name: '동남구', full: '천안시 동남구', level: 'gu', gu: 'dongnam', parent: 'cheonan', type: 'mixed', population: 265917, households: 115586, legal: [] },
  { slug: 'seobuk-gu', name: '서북구', full: '천안시 서북구', level: 'gu', gu: 'seobuk', parent: 'cheonan', type: 'mixed', population: 411079, households: 175839, legal: [] },
];
for (const [name, gu, level, type, population, households, legal] of ADMIN) {
  const b = name.startsWith('불당') ? { population: null, households: null } : { population, households };
  regions.push({ slug: slugOf(name), name, full: `천안시 ${GU[gu]} ${name}`, level, gu, parent: `${gu}-gu`, type, ...b, legal: legal.split(' ') });
}
const adminByLegal = {};
for (const r of regions.filter((x) => x.level === 'dong')) for (const l of r.legal) (adminByLegal[l] ||= []).push(r);
const names = new Set(regions.map((r) => r.name));
for (const [legal, admins] of Object.entries(adminByLegal)) {
  if (names.has(legal)) continue; // 봉명동·신방동·백석동은 행정동 페이지가 곧 법정동 페이지
  const a = admins[0];
  regions.push({ slug: slugOf(legal), name: legal, full: `천안시 ${GU[a.gu]} ${legal}`, level: 'bdong', gu: a.gu, parent: a.slug, admins: admins.map((x) => x.slug), type: BDONG_TYPE[legal] || a.type, population: null, households: null, legal: [] });
  names.add(legal);
}
for (const [name, legal, type, slug] of PLACES) {
  const p = regions.find((r) => r.name === legal);
  if (!p) throw new Error(`no ${legal}`);
  regions.push({ slug: slug || slugOf(name), name, full: `천안시 ${GU[p.gu]} ${legal} ${name}`, level: 'place', gu: p.gu, parent: p.slug, type, population: null, households: null, legal: [] });
}
const slugs = regions.map((r) => r.slug);
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dup.length) throw new Error('duplicate slugs ' + dup);

const out = { _source: '위키백과 「천안시의 행정 구역」 2024-01-01 기준 표(2026-11-11 조회). 불당1·2동 합계 ' + JSON.stringify(BULDANG_TOTAL), buldangTotal: BULDANG_TOTAL, regions };
fs.writeFileSync(new URL('../shared/cheonan-regions.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(regions.length, 'regions', Object.entries(regions.reduce((a, r) => ((a[r.level] = (a[r.level] || 0) + 1), a), {})));
