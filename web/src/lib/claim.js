import { validBizNo } from './bizno.js';
import { ntsValidate } from './nts.js';
import { newCode, hash, checkOtp, OTP_TTL_MS, OTP_MAX_ATTEMPTS } from './otp.js';
import { newToken, tokenHash } from './tokens.js';
import { sendSMS } from './popbill.js';
import { TRADES } from '../pages/dong.js';
import { getDong } from '../db.js';

export const decideClaim = ({ existingClaimed }) => (existingClaimed ? 'held' : 'create');

const TRADE_KEYS = Object.keys(TRADES);
const COOLDOWN_MS = 60_000;
const NEED = ['DATA_GO_KEY', 'POPBILL_LINK_ID', 'POPBILL_SECRET_KEY', 'POPBILL_CORP_NUM', 'POPBILL_SENDER', 'OTP_PEPPER'];
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const err = (status, error) => json({ error }, status);
const REASON = {
  mismatch: '사업자 정보가 국세청 기록과 맞지 않아요. 번호, 개업일자, 대표자 성명을 다시 확인해 주세요.',
  closed: '폐업한 사업자는 등록할 수 없어요.',
  suspended: '휴업 중인 사업자는 등록할 수 없어요.',
};

async function guard(req, env) {
  if (req.method !== 'POST') return err(405, '잘못된 요청이에요.');
  const missing = NEED.find((k) => !env[k]);
  if (missing) return err(503, `설정이 필요해요: ${missing}`);
  if (env.LIMIT) {
    const { success } = await env.LIMIT.limit({ key: req.headers.get('cf-connecting-ip') || 'local' });
    if (!success) return err(429, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
  }
  return null;
}
const body = (req) => req.json().then((b) => (b && typeof b === 'object' ? b : {}), () => ({}));
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');


const RESTART = '처음부터 다시 해 주세요.';

// deps are injectable for tests; production uses the defaults
export async function claimVerify(req, env, deps = { ntsValidate, sendSMS }) {
  const bad = await guard(req, env);
  if (bad) return bad;
  const b = await body(req);
  const d = {
    trade: str(b.trade, 20), dong: str(b.dong, 80), name: str(b.name, 60), bNo: str(b.bNo, 20).replace(/\D/g, ''),
    startDt: str(b.startDt, 20).replace(/\D/g, ''), pNm: str(b.pNm, 30), phone: str(b.phone, 20).replace(/\D/g, ''),
  };
  if (!TRADE_KEYS.includes(d.trade) || !(await getDong(env, d.dong))) return err(400, '업종과 동네를 골라 주세요.');
  if (!d.name || !d.pNm) return err(400, '상호와 대표자 성명을 입력해 주세요.');
  if (!validBizNo(d.bNo)) return err(400, '사업자등록번호를 다시 확인해 주세요.');
  if (!/^\d{8}$/.test(d.startDt)) return err(400, '개업일자는 8자리 숫자로 입력해 주세요. 예: 20200315');
  if (!/^01\d{8,9}$/.test(d.phone)) return err(400, '휴대폰 번호를 다시 확인해 주세요.');

  const phoneHash = await hash(d.phone, env.OTP_PEPPER);
  const now = Date.now();
  const iso = new Date(now).toISOString();
  if (env.LIMIT && !(await env.LIMIT.limit({ key: `p:${phoneHash}` })).success) return err(429, '잠시 뒤에 다시 받아 주세요.');
  const recent = await env.D1.prepare('SELECT 1 AS x FROM otps WHERE phone_hash = ? AND purpose = ? AND created_at > ? LIMIT 1')
    .bind(phoneHash, 'claim', new Date(now - COOLDOWN_MS).toISOString()).first();
  if (recent) return err(429, '잠시 뒤에 다시 받아 주세요.');

  let nts;
  try { nts = await deps.ntsValidate(env, { bNo: d.bNo, startDt: d.startDt, pNm: d.pNm, bNm: d.name }); } catch {
    return err(502, '국세청 확인이 지금 어려워요. 잠시 후 다시 시도해 주세요.');
  }
  if (!nts.ok) return err(422, REASON[nts.reason]);

  const code = newCode();
  const secret = newToken();
  // sweep of expired otps rows (expires_at < now) goes into the Task 7 cron
  const ins = await env.D1.prepare(
    'INSERT INTO otps (phone_hash, code_hash, purpose, payload, expires_at, attempts, created_at, updated_at) VALUES (?,?,?,?,?,0,?,?)',
  ).bind(phoneHash, await hash(code, env.OTP_PEPPER), 'claim', JSON.stringify({ ...d, handleHash: await tokenHash(secret) }), now + OTP_TTL_MS, iso, iso).run();
  const rowId = ins.meta.last_row_id;
  try {
    await deps.sendSMS(env, d.phone, `[로컬브릿지AI] 인증번호는 ${code}예요. 5분 안에 입력해 주세요.`);
  } catch {
    await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(rowId).run();
    return err(502, '인증 문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  await env.D1.prepare('DELETE FROM otps WHERE phone_hash = ? AND purpose = ? AND id != ?').bind(phoneHash, 'claim', rowId).run();
  return json({ claimId: `${rowId}.${secret}` });
}

export async function claimConfirm(req, env) {
  const bad = await guard(req, env);
  if (bad) return bad;
  const b = await body(req);
  const [idStr, secret = ''] = String(b.claimId ?? '').split('.');
  const id = Number(idStr);
  const code = str(b.code, 10);
  if (!Number.isInteger(id) || !secret || secret.length > 64 || !/^\d{6}$/.test(code)) return err(400, '인증번호 6자리를 입력해 주세요.');
  const gone = () => err(404, `인증 요청을 찾지 못했어요. ${RESTART}`);
  const pre = await env.D1.prepare('SELECT payload FROM otps WHERE id = ? AND purpose = ?').bind(id, 'claim').first();
  if (!pre || JSON.parse(pre.payload).handleHash !== await tokenHash(secret)) return gone();

  // reserve one attempt atomically before comparing, so parallel guesses cannot exceed the cap
  const now = Date.now();
  const row = await env.D1.prepare(
    'UPDATE otps SET attempts = attempts + 1 WHERE id = ? AND purpose = ? AND attempts < ? AND expires_at > ? RETURNING code_hash AS codeHash, payload, attempts, expires_at AS expiresAt',
  ).bind(id, 'claim', OTP_MAX_ATTEMPTS, now).first();
  if (!row) {
    await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
    return err(410, `인증 시간이 지났거나 여러 번 틀렸어요. ${RESTART}`);
  }
  const res = checkOtp({ ...row, attempts: row.attempts - 1 }, await hash(code, env.OTP_PEPPER), now);
  if (res === 'wrong') {
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
      return err(410, `인증번호를 여러 번 틀렸어요. ${RESTART}`);
    }
    return err(400, '인증번호가 맞지 않아요. 다시 확인해 주세요.');
  }
  if (res !== 'ok') {
    await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
    return err(410, `인증 시간이 지났어요. ${RESTART}`);
  }
  // 한 번만 소비: 동시에 두 번 확인해도 한쪽만 통과
  const used = await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
  if (!used.meta.changes) return gone();

  try {
    const p = JSON.parse(row.payload);
    const dr = await env.D1.prepare('SELECT id, slug FROM dongs WHERE slug = ?').bind(p.dong).first();
    const dup = await env.D1.prepare('SELECT id FROM businesses WHERE name = ? AND dong_id = ? AND trade = ? AND claimed = 1 LIMIT 1').bind(p.name, dr.id, p.trade).first();
    const verdict = decideClaim({ existingClaimed: !!dup });
    const iso = new Date().toISOString();
    const rand = [...crypto.getRandomValues(new Uint8Array(6))].map((n) => (n % 36).toString(36)).join('');
    const slug = `${dr.slug}-${p.trade}-${rand}`;
    const mk = (biz) => env.D1.prepare('INSERT INTO landings (business_id, slug, status, biz_no, biz_verified_at, owner_phone, phone_verified_at, content, areas, edit_token_hash, billing, created_at, updated_at) VALUES (' + biz + ',?,?,?,?,?,?,?,?,?,?,?,?)');
    const vals = (hashed) => [slug, verdict === 'create' ? 'draft' : 'held', p.bNo, iso, p.phone, iso, JSON.stringify({ name: p.name }), JSON.stringify([p.dong]), hashed, 'none', iso, iso];
    // held: reuse the existing claimed business, no new businesses row
    if (verdict === 'held') {
      await mk('?').bind(dup.id, ...vals(null)).run();
      return json({ held: true });
    }
    const token = newToken();
    await env.D1.batch([
      env.D1.prepare('INSERT INTO businesses (name, trade, dong_id, source, claimed, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').bind(p.name, p.trade, dr.id, 'self', 1, iso, iso),
      mk('last_insert_rowid()').bind(...vals(await tokenHash(token))),
    ]);
    return json({ editUrl: `/edit#t=${token}` });
  } catch {
    // the code is already used up, so the user has to verify again
    return err(500, `등록 중에 문제가 생겼어요. ${RESTART}`);
  }
}
