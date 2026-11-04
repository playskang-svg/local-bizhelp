import dongs from '../../../shared/dongs.json' with { type: 'json' };

const SLUGS = new Set(dongs.map((d) => d.slug));
const MAX_STR = 600;
const MAX_ARR = 20;
const s = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_STR) : '');
const arr = (v) => (Array.isArray(v) ? v.slice(0, MAX_ARR) : []);
const pairs = (v, a, b) => arr(v).filter((x) => x && typeof x === 'object')
  .map((x) => ({ [a]: s(x[a]), [b]: s(x[b]) })).filter((x) => x[a]);
const https = (v) => { const t = s(v); try { return new URL(t).protocol === 'https:' ? t : ''; } catch { return ''; } };
export const CHANNEL_KEYS = ['naverPlace', 'instagram', 'kakao', 'blog'];

const FIELDS = {
  name: s, tagline: s, intro: s, hours: s,
  phone: (v) => s(v).replace(/[^\d+\-() ]/g, ''),
  services: (v) => pairs(v, 'title', 'detail'),
  excludes: (v) => arr(v).map(s).filter(Boolean),
  extraCosts: (v) => pairs(v, 'when', 'note'),
};

// returns { draft, areas? }: known keys only; photos are never settable by the model
export function applyUpdate(draft, update) {
  const out = { ...(draft ?? {}) };
  if (!update || typeof update !== 'object') return { draft: out };
  for (const [k, clean] of Object.entries(FIELDS)) if (k in update) out[k] = clean(update[k]);
  if (update.channels && typeof update.channels === 'object') {
    const ch = { ...(out.channels ?? {}) };
    for (const k of CHANNEL_KEYS) if (k in update.channels) { const u = https(update.channels[k]); if (u) ch[k] = u; else delete ch[k]; }
    out.channels = ch;
  }
  const res = { draft: out };
  if (Array.isArray(update.areas)) res.areas = [...new Set(update.areas.filter((x) => SLUGS.has(x)))].slice(0, MAX_ARR);
  return res;
}

// draft may carry `areas` (merged by the caller). Empty array = owner answered "none".
export function nextQuestion(d = {}) {
  if (!d.services?.length) return '어떤 일을 하시는지 알려 주세요. 대표 서비스 한두 가지부터 말씀해 주세요.';
  if (d.excludes === undefined) return '반대로 하지 않는 일이나 빼는 일이 있나요? 없으면 "없어요"라고 해 주세요.';
  if (d.extraCosts === undefined) return '추가 비용이 생기는 경우가 있나요? 예를 들어 엘리베이터가 없거나 짐이 많을 때요.';
  if (d.areas === undefined || d.areas === null) return '출장 가능한 천안 동네를 알려 주세요.';
  if (!d.hours) return '영업시간은 어떻게 되나요?';
  if (!d.phone) return '손님이 연락할 전화번호를 알려 주세요.';
  if (!d.channels || !Object.keys(d.channels).length) return '네이버 플레이스나 인스타그램 같은 채널이 있으면 주소를 알려 주세요.';
  if (!d.photos?.length) return '가게나 작업 사진을 올려 주세요. 아래 사진 올리기 버튼을 눌러 주세요.';
  return null;
}
