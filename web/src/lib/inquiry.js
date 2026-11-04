import { sendLMS } from './popbill.js';
import { normalizeSrc } from './src.js';
import { tokenHash } from './tokens.js';

const DAY = 86_400_000;
const REMIND_AFTER_MS = 12 * 3600_000;
const ORIGIN = 'https://local.bizhelp.kr';
const NEED = ['POPBILL_LINK_ID', 'POPBILL_SECRET_KEY', 'POPBILL_CORP_NUM', 'POPBILL_SENDER', 'OTP_PEPPER'];
const LANDING_DAILY_CAP = 20;
const SUBJECT = '[로컬브릿지AI_천안] 새 문의';
const KEEP_MS = 365 * DAY;
// work goes verbatim into the owner LMS under our sender, so no links or domains
const LINKY = /http|www\.|\.(?:com|kr|net|co|org)\b|[a-z0-9-]+\.[a-z]{2,}/i;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const iso = (ms) => new Date(ms).toISOString();
const kstDate = (ms) => iso(ms + 9 * 3600_000).slice(0, 10);

export function validateInquiry(input, landing, now) {
  const no = (field, message) => ({ ok: false, field, message });
  const b = input && typeof input === 'object' ? input : {};
  if (b.hp) return no('hp', '');
  const dong = typeof b.dong === 'string' ? b.dong : '';
  if (!(landing.areas ?? []).includes(dong)) return no('dong', '이 업체가 출장 가는 동네를 골라 주세요.');
  const work = typeof b.work === 'string' ? b.work.trim().slice(0, 100) : '';
  if (!work) return no('work', '어떤 작업이 필요한지 적어 주세요.');
  if (LINKY.test(work)) return no('work', '작업 내용에는 주소(링크)를 넣을 수 없어요.');
  const wishDate = typeof b.wishDate === 'string' ? b.wishDate.trim() : '';
  if (wishDate) {
    const today = kstDate(now);
    const t = Date.parse(`${wishDate}T00:00:00Z`);
    const real = /^\d{4}-\d{2}-\d{2}$/.test(wishDate) && !Number.isNaN(t) && iso(t).slice(0, 10) === wishDate;
    if (!real) return no('wishDate', '희망 날짜를 다시 확인해 주세요.');
    if (wishDate < today) return no('wishDate', '오늘이나 앞으로의 날짜를 골라 주세요.');
    if (wishDate > kstDate(now + 180 * DAY)) return no('wishDate', '180일 안의 날짜를 골라 주세요.');
  }
  const phone = String(b.phone ?? '').replace(/\D/g, '');
  if (!/^010\d{8}$|^01[16789]\d{7,8}$/.test(phone)) return no('phone', '휴대폰 번호를 다시 확인해 주세요.');
  if (b.consent !== true) return no('consent', '연락 동의에 체크해 주세요.');
  return { ok: true, value: { dong, work, wishDate: wishDate || null, phone, src: normalizeSrc(b.src) } };
}

// prev: earlier inquiries of the same landing
export const isDuplicate = (prev, phone, now) => prev.some((p) => p.customerPhone === phone && now - p.createdAt < DAY);

export const needsReminder = (row, now) =>
  row.valid !== false && row.valid !== 0 && (row.notifyResult === undefined || row.notifyResult === 'sent')
  && !row.ackAt && !row.remindedAt && now - row.createdAt >= REMIND_AFTER_MS;

// Token is derived from a server secret so the reminder can resend the same link while only its hash is stored.
export async function ackToken(env, id) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.OTP_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`ack:${id}`));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// R21 caps, counted per KST day
async function overCap(env, landingId, now) {
  const dayStart = iso(Date.parse(`${kstDate(now)}T00:00:00+09:00`));
  const count = async (sql, ...a) => (await env.D1.prepare(sql).bind(...a).first()).c;
  return await count("SELECT count(*) c FROM inquiries WHERE landing_id = ? AND notify_result IN ('sent','capped') AND created_at >= ?", landingId, dayStart) >= LANDING_DAILY_CAP
    || await count("SELECT count(*) c FROM inquiries WHERE notify_result = 'sent' AND created_at >= ?", dayStart) >= (Number(env.SMS_DAILY_CAP) || 300);
}

async function sendOwner(env, deps, { id, ownerPhone, dongName, work, wishDate, phone }) {
  const text = `동네: ${dongName}\n작업: ${work}\n희망일: ${wishDate || '미정'}\n손님 번호: ${phone}\n\n연락하셨으면 눌러 주세요: ${ORIGIN}/ack/${await ackToken(env, id)}`;
  await deps.sendLMS(env, ownerPhone, SUBJECT, text);
}

export async function submitInquiry(req, env, deps = { sendLMS }) {
  if (req.method !== 'POST') return json({ ok: false, message: '잘못된 요청이에요.' }, 405);
  if (env.LIMIT && !(await env.LIMIT.limit({ key: `i:${req.headers.get('cf-connecting-ip') || 'local'}` })).success) {
    return json({ ok: false, message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }, 429);
  }
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== 'object') return json({ ok: false, message: '잘못된 요청이에요.' }, 400);
  const landing = await env.D1.prepare("SELECT id, areas, owner_phone AS ownerPhone FROM landings WHERE slug = ? AND status = 'published'")
    .bind(String(b.slug ?? '').slice(0, 80)).first();
  if (!landing) return json({ ok: false, message: '찾을 수 없는 업체예요.' }, 404);
  let areas = [];
  try { areas = JSON.parse(landing.areas || '[]'); } catch { /* none */ }
  const now = Date.now();
  const v = validateInquiry(b, { areas }, now);
  if (!v.ok) return v.field === 'hp' ? json({ ok: true }) : json({ ok: false, field: v.field, message: v.message }, 400);
  const { dong, work, wishDate, phone, src } = v.value;

  const prev = (await env.D1.prepare('SELECT customer_phone, created_at FROM inquiries WHERE landing_id = ? AND created_at > ?')
    .bind(landing.id, iso(now - DAY)).all()).results.map((r) => ({ customerPhone: r.customer_phone, createdAt: Date.parse(r.created_at) }));
  const dup = isDuplicate(prev, phone, now);
  const ins = await env.D1.prepare('INSERT INTO inquiries (landing_id, dong, work, wish_date, customer_phone, consent, src, valid, invalid_reason) VALUES (?,?,?,?,?,1,?,?,?)')
    .bind(landing.id, dong, work, wishDate, phone, src, dup ? 0 : 1, dup ? 'duplicate' : null).run();
  if (dup) return json({ ok: true });

  const id = ins.meta.last_row_id;
  let result = 'sent';
  if (NEED.some((k) => !env[k])) result = 'config-missing';
  else if (await overCap(env, landing.id, now)) result = 'capped';
  else {
    try {
      await env.D1.prepare('UPDATE inquiries SET ack_token_hash = ? WHERE id = ?').bind(await tokenHash(await ackToken(env, id)), id).run();
      const d = await env.D1.prepare('SELECT name FROM dongs WHERE slug = ?').bind(dong).first();
      await sendOwner(env, deps, { id, ownerPhone: landing.ownerPhone, dongName: d?.name ?? dong, work, wishDate, phone });
    } catch (e) { result = 'failed'; console.error('inquiry notify failed', e?.message); }
  }
  await env.D1.prepare('UPDATE inquiries SET notified_at = ?, notify_result = ? WHERE id = ?').bind(iso(Date.now()), result, id).run();
  return json({ ok: true });
}

export const ackExists = async (env, token) =>
  !!(await env.D1.prepare('SELECT id FROM inquiries WHERE ack_token_hash = ?').bind(await tokenHash(token)).first());

// POST /api/ack: JSON { token } from the page script, or a urlencoded form from the noscript button
export async function ackPost(req, env) {
  if (req.method !== 'POST') return json({ ok: false }, 405);
  const form = (req.headers.get('content-type') || '').includes('form');
  const b = form ? Object.fromEntries(await req.formData().catch(() => [])) : await req.json().catch(() => null);
  const token = typeof b?.token === 'string' ? b.token.slice(0, 64) : '';
  if (!token || !(await ackInquiry(env, token))) return json({ ok: false }, 404);
  return form ? new Response(null, { status: 303, headers: { location: `/ack/${token}`, 'cache-control': 'no-store' } }) : json({ ok: true });
}

export async function ackInquiry(env, token) {
  const row = await env.D1.prepare('SELECT id FROM inquiries WHERE ack_token_hash = ?').bind(await tokenHash(token)).first();
  if (!row) return false;
  await env.D1.prepare('UPDATE inquiries SET ack_at = ? WHERE id = ? AND ack_at IS NULL').bind(iso(Date.now()), row.id).run();
  return true;
}

export async function runCron(env, deps = { sendLMS }, now = Date.now()) {
  await env.D1.prepare('DELETE FROM otps WHERE expires_at < ?').bind(now).run();
  await env.D1.prepare('DELETE FROM inquiries WHERE created_at < ?').bind(iso(now - KEEP_MS)).run(); // privacy policy: 1 year
  if (NEED.some((k) => !env[k])) return;
  const hour = new Date(now + 9 * 3600_000).getUTCHours();
  if (hour >= 21 || hour < 8) return; // quiet hours KST, picked up by the first run after 08:00

  // one retry for a failed owner alert; 'config-missing' is never retried
  const failed = (await env.D1.prepare(`SELECT i.id, i.landing_id AS landingId, i.dong, i.work, i.wish_date AS wishDate, i.customer_phone AS phone,
      l.owner_phone AS ownerPhone, d.name AS dongName
    FROM inquiries i JOIN landings l ON l.id = i.landing_id AND l.status = 'published' LEFT JOIN dongs d ON d.slug = i.dong
    WHERE i.valid = 1 AND i.notify_result = 'failed' ORDER BY i.id LIMIT 20`).all()).results;
  for (const r of failed) {
    if (await overCap(env, r.landingId, now)) continue; // stays 'failed' until the cap frees up
    // claim first so overlapping cron runs cannot send twice
    const c = await env.D1.prepare("UPDATE inquiries SET notify_result = 'retrying' WHERE id = ? AND notify_result = 'failed'").bind(r.id).run();
    if (!c.meta.changes) continue;
    let result = 'sent';
    try {
      await env.D1.prepare('UPDATE inquiries SET ack_token_hash = ? WHERE id = ?').bind(await tokenHash(await ackToken(env, r.id)), r.id).run();
      await sendOwner(env, deps, { ...r, dongName: r.dongName ?? r.dong });
    } catch (e) { result = 'failed-final'; console.error('inquiry notify retry failed', e?.message); }
    await env.D1.prepare('UPDATE inquiries SET notified_at = ?, notify_result = ? WHERE id = ?').bind(iso(now), result, r.id).run();
  }

  // reminder 12 h after the first alert actually went out (a late retry resets that clock)
  const rows = (await env.D1.prepare(`SELECT i.id, i.dong, i.work, i.wish_date AS wishDate, i.customer_phone AS phone, i.created_at AS createdAt,
      i.ack_at AS ackAt, i.reminded_at AS remindedAt, i.valid, i.notify_result AS notifyResult, l.owner_phone AS ownerPhone, d.name AS dongName
    FROM inquiries i JOIN landings l ON l.id = i.landing_id AND l.status = 'published' LEFT JOIN dongs d ON d.slug = i.dong
    WHERE i.valid = 1 AND i.notify_result = 'sent' AND i.ack_at IS NULL AND i.reminded_at IS NULL AND i.created_at <= ?1
      AND (i.notified_at IS NULL OR i.notified_at <= ?1) ORDER BY i.id LIMIT 20`)
    .bind(iso(now - REMIND_AFTER_MS)).all()).results;
  for (const r of rows) {
    if (!needsReminder({ ...r, createdAt: Date.parse(r.createdAt) }, now)) continue;
    // claim first so overlapping cron runs cannot send twice
    const c = await env.D1.prepare('UPDATE inquiries SET reminded_at = ? WHERE id = ? AND reminded_at IS NULL').bind(iso(now), r.id).run();
    if (!c.meta.changes) continue;
    try { await sendOwner(env, deps, { ...r, dongName: r.dongName ?? r.dong }); } catch (e) { console.error('reminder failed', e?.message); }
  }
}
