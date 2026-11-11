// 상담 방식: 전화번호(CONSULT_PHONE)가 있으면 '체크하고 문자 보내기', 없으면 '견적 받기'(링크프라이스 딥링크).
// 나중에 번호만 넣으면(wrangler vars 또는 대시보드) 코드 수정 없이 문자·전화로 바뀐다.
// 견적 링크: shared/soomgo-deeplinks.json 에 링크프라이스에서 발급한 주소가 있으면 그것을,
// 없으면 LINKPRICE_SITE(이 사이트의 링크프라이스 사이트 코드)로 같은 형식의 주소를 만든다. 둘 다 없으면 버튼을 숨긴다.
// 화면에는 서비스 이름을 쓰지 않는다(운영 규칙).
import MAP from '../../../shared/soomgo-map.json' with { type: 'json' };
import ISSUED from '../../../shared/soomgo-deeplinks.json' with { type: 'json' };

const digits = (v) => String(v || '').replace(/\D/g, '');

export function deepLink(site, slug) {
  if (ISSUED[slug]) return ISSUED[slug];
  if (!/^A\d{6,12}$/.test(site || '')) return '';
  return `https://lpweb.kr/click.php?m=soomgo&a=${site}&l=9999&l_cd1=3&l_cd2=0&tu=${encodeURIComponent(`https://soomgo.com/hire/${slug}`)}`;
}

export function contactOf(env, g) {
  const phone = digits(env?.CONSULT_PHONE);
  if (phone) return { mode: 'sms', phone };
  const m = MAP[g.slug] || { default: '집-수리', subs: {} };
  const site = env?.LINKPRICE_SITE || '';
  const def = deepLink(site, m.default);
  const subs = Object.fromEntries(g.subs.map((s) => [s, deepLink(site, (m.subs || {})[s] || m.default)]).filter(([, u]) => u));
  return { mode: 'quote', phone: '', url: def, subs, closest: m.closest ? m.default.replace(/-/g, ' ') : '' };
}
