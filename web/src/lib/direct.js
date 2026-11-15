// POST /api/direct-inquiry — 키워드·지역 페이지의 '직접 문의' 폼. 동·작업·희망일·휴대폰·개인정보 동의를 받아
// direct_inquiries(D1)에 접수 기록만 남긴다. 업체로 자동 전달하지 않는다(공개 업체 0, 문자도 보내지 않는다).
// 휴대폰 번호는 로그·응답·GA 이벤트에 내보내지 않는다.
import { GROUPS, REGIONS, groupOf, regionOf } from '../kw/data.js';
import { normalizeSrc } from './src.js';
import { page } from '../html.js';

const DAY = 86_400_000;
const KEEP_MS = 365 * DAY;
const DAILY_CAP = 300;
const UTM = /^[A-Za-z0-9_.-]{1,60}$/;
const PAGE = /^\/[a-z0-9/-]{0,100}$/;

// 문의에서 고를 수 있는 동네: 읍·면·행정동 31곳 + 천안 다른 지역
export const DIRECT_REGIONS = REGIONS.filter((r) => r.level === 'eup' || r.level === 'myeon' || r.level === 'dong');
export const DIRECT_OTHER = 'other';
export const DIRECT_UNKNOWN = 'unknown';
export const DIRECT_NOTICE_VERSION = '2026-11-15';

const iso = (ms) => new Date(ms).toISOString();
const kstDate = (ms) => iso(ms + 9 * 3600_000).slice(0, 10);
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const utm = (v) => (typeof v === 'string' && UTM.test(v) ? v : '');

export function validateDirect(input, now) {
  const no = (field, message) => ({ ok: false, field, message });
  const b = input && typeof input === 'object' ? input : {};
  if (b.hp) return no('hp', '');
  const region = typeof b.region === 'string' ? b.region : '';
  if (region !== DIRECT_OTHER && !DIRECT_REGIONS.some((r) => r.slug === region)) return no('region', '동네를 골라 주세요.');
  const group = typeof b.group === 'string' ? b.group : '';
  if (group !== DIRECT_UNKNOWN && !groupOf(group)) return no('group', '어떤 작업인지 골라 주세요.');
  const wishDate = typeof b.wishDate === 'string' ? b.wishDate.trim() : '';
  if (wishDate) {
    const t = Date.parse(`${wishDate}T00:00:00Z`);
    const real = /^\d{4}-\d{2}-\d{2}$/.test(wishDate) && !Number.isNaN(t) && iso(t).slice(0, 10) === wishDate;
    if (!real) return no('wishDate', '희망 날짜를 다시 확인해 주세요.');
    if (wishDate < kstDate(now)) return no('wishDate', '오늘이나 앞으로의 날짜를 골라 주세요.');
    if (wishDate > kstDate(now + 180 * DAY)) return no('wishDate', '180일 안의 날짜를 골라 주세요.');
  }
  const phone = String(b.phone ?? '').replace(/\D/g, '');
  if (!/^010\d{8}$|^01[16789]\d{7,8}$/.test(phone)) return no('phone', '휴대폰 번호를 다시 확인해 주세요.');
  if (b.consent !== true && b.consent !== 'on' && b.consent !== '1') return no('consent', '개인정보 수집·이용에 동의해 주세요.');
  return {
    ok: true,
    value: {
      region, group, wishDate: wishDate || null, phone,
      page: typeof b.page === 'string' && PAGE.test(b.page) ? b.page : '',
      src: normalizeSrc(b.src),
      utm: { source: utm(b.utm_source), medium: utm(b.utm_medium), campaign: utm(b.utm_campaign), content: utm(b.utm_content) },
    },
  };
}

export async function submitDirect(req, env, now = Date.now()) {
  if (req.method !== 'POST') return json({ ok: false, message: '잘못된 요청이에요.' }, 405);
  const form = (req.headers.get('content-type') || '').includes('form');
  if (env.LIMIT && !(await env.LIMIT.limit({ key: `q:${req.headers.get('cf-connecting-ip') || 'local'}` })).success) {
    return reply(form, { ok: false, message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }, 429);
  }
  const body = form
    ? Object.fromEntries([...(await req.formData().catch(() => new FormData())).entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']))
    : await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return reply(form, { ok: false, message: '잘못된 요청이에요.' }, 400);
  const v = validateDirect(body, now);
  if (!v.ok) return v.field === 'hp' ? reply(form, { ok: true }) : reply(form, { ok: false, field: v.field, message: v.message }, 400);
  const x = v.value;

  const dayStart = iso(Date.parse(`${kstDate(now)}T00:00:00+09:00`));
  if ((await env.D1.prepare('SELECT count(*) c FROM direct_inquiries WHERE created_at >= ?').bind(dayStart).first()).c >= DAILY_CAP) {
    return reply(form, { ok: false, message: '오늘 접수가 많아요. 내일 다시 시도해 주세요.' }, 429);
  }
  const dup = !!(await env.D1.prepare('SELECT id FROM direct_inquiries WHERE phone = ? AND group_slug = ? AND created_at > ?').bind(x.phone, x.group, iso(now - DAY)).first());
  await env.D1.prepare(`INSERT INTO direct_inquiries (created_at, region_slug, group_slug, wish_date, phone, consent, page, src, utm_source, utm_medium, utm_campaign, utm_content, valid, invalid_reason)
    VALUES (?,?,?,?,?,1,?,?,?,?,?,?,?,?)`)
    .bind(iso(now), x.region, x.group, x.wishDate, x.phone, x.page, x.src, x.utm.source, x.utm.medium, x.utm.campaign, x.utm.content, dup ? 0 : 1, dup ? 'duplicate' : null).run();
  return reply(form, { ok: true });
}

function reply(form, data, status = 200) {
  if (!form) return json(data, status);
  const msg = data.ok
    ? '<h1>문의가 접수됐어요</h1><p class="lead">아직 이 동네에 연결할 업체를 여는 중이라 접수 기록으로 보관돼요. 업체에 자동으로 전달되지는 않아요.</p>'
    : `<h1>접수하지 못했어요</h1><p class="lead">${data.message || '다시 시도해 주세요.'}</p>`;
  return page({ title: '직접 문의 접수 | 로컬브릿지AI_천안', desc: '', noindex: true, status, body: `${msg}<a class="btn" href="/cheonan">천안 집수리로 돌아가기</a>` });
}

// 개인정보 처리방침(접수 1년 뒤 파기)과 같은 기준: 접수 1년이 지난 직접 문의를 지운다
export async function purgeDirect(env, now = Date.now()) {
  await env.D1.prepare('DELETE FROM direct_inquiries WHERE created_at < ?').bind(iso(now - KEEP_MS)).run();
}
