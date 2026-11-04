import { validBizNo } from './bizno.js';
import { ntsValidate } from './nts.js';
import { newCode, hash, checkOtp, OTP_TTL_MS } from './otp.js';
import { newToken, tokenHash } from './tokens.js';
import { sendSMS } from './popbill.js';
import { getDong } from '../db.js';

export const decideClaim = ({ existingClaimed }) => (existingClaimed ? 'held' : 'create');

const TRADE_KEYS = ['move', 'clean', 'install', 'repair'];
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

export async function claimVerify(req, env) {
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

  let nts;
  try { nts = await ntsValidate(env, { bNo: d.bNo, startDt: d.startDt, pNm: d.pNm, bNm: d.name }); } catch {
    return err(502, '국세청 확인이 지금 어려워요. 잠시 후 다시 시도해 주세요.');
  }
  if (!nts.ok) return err(422, REASON[nts.reason]);

  const code = newCode();
  const phoneHash = await hash(d.phone, env.OTP_PEPPER);
  const now = Date.now();
  const iso = new Date(now).toISOString();
  await env.D1.prepare('DELETE FROM otps WHERE phone_hash = ? AND purpose = ?').bind(phoneHash, 'claim').run();
  const ins = await env.D1.prepare(
    'INSERT INTO otps (phone_hash, code_hash, purpose, payload, expires_at, attempts, created_at, updated_at) VALUES (?,?,?,?,?,0,?,?)',
  ).bind(phoneHash, await hash(code, env.OTP_PEPPER), 'claim', JSON.stringify(d), now + OTP_TTL_MS, iso, iso).run();
  const claimId = ins.meta.last_row_id;
  try {
    await sendSMS(env, d.phone, `[로컬브릿지AI] 인증번호는 ${code}예요. 5분 안에 입력해 주세요.`);
  } catch {
    await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(claimId).run();
    return err(502, '인증 문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return json({ claimId });
}

export async function claimConfirm(req, env) {
  const bad = await guard(req, env);
  if (bad) return bad;
  const b = await body(req);
  const id = Number(b.claimId);
  const code = str(b.code, 10);
  if (!Number.isInteger(id) || !/^\d{6}$/.test(code)) return err(400, '인증번호 6자리를 입력해 주세요.');
  const row = await env.D1.prepare('SELECT id, code_hash AS codeHash, payload, expires_at AS expiresAt, attempts FROM otps WHERE id = ? AND purpose = ?').bind(id, 'claim').first();
  if (!row) return err(404, '인증 요청을 찾지 못했어요. 처음부터 다시 해 주세요.');
  const res = checkOtp(row, await hash(code, env.OTP_PEPPER), Date.now());
  if (res === 'expired' || res === 'locked') {
    await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
    return err(410, res === 'expired' ? '인증 시간이 지났어요. 처음부터 다시 해 주세요.' : '인증번호를 여러 번 틀렸어요. 처음부터 다시 해 주세요.');
  }
  if (res === 'wrong') {
    const up = await env.D1.prepare('UPDATE otps SET attempts = attempts + 1 WHERE id = ? RETURNING attempts').bind(id).first();
    if (up && up.attempts >= 5) await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
    return err(400, '인증번호가 맞지 않아요. 다시 확인해 주세요.');
  }
  // 한 번만 소비: 동시에 두 번 확인해도 한쪽만 통과
  const used = await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
  if (!used.meta.changes) return err(404, '이미 사용한 인증이에요. 처음부터 다시 해 주세요.');

  const p = JSON.parse(row.payload);
  const dr = await env.D1.prepare('SELECT id, slug FROM dongs WHERE slug = ?').bind(p.dong).first();
  const dup = await env.D1.prepare('SELECT 1 AS x FROM businesses WHERE name = ? AND dong_id = ? AND trade = ? AND claimed = 1 LIMIT 1').bind(p.name, dr.id, p.trade).first();
  const verdict = decideClaim({ existingClaimed: !!dup });
  const iso = new Date().toISOString();
  const rand = [...crypto.getRandomValues(new Uint8Array(6))].map((n) => (n % 36).toString(36)).join('');
  const slug = `${dr.slug}-${p.trade}-${rand}`;
  const token = verdict === 'create' ? newToken() : null;
  await env.D1.batch([
    env.D1.prepare('INSERT INTO businesses (name, trade, dong_id, source, claimed, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .bind(p.name, p.trade, dr.id, 'self', verdict === 'create' ? 1 : 0, iso, iso),
    env.D1.prepare(`INSERT INTO landings (business_id, slug, status, biz_no, biz_verified_at, owner_phone, phone_verified_at, content, areas, edit_token_hash, billing, created_at, updated_at)
      VALUES (last_insert_rowid(),?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(slug, verdict === 'create' ? 'draft' : 'held', p.bNo, iso, p.phone, iso, JSON.stringify({ name: p.name }), JSON.stringify([p.dong]),
        token ? await tokenHash(token) : null, 'none', iso, iso),
  ]);
  return verdict === 'create' ? json({ editUrl: `/edit/${token}` }) : json({ held: true });
}
