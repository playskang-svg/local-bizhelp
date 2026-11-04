const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const OTP_TTL_MS = 300_000;
export const OTP_MAX_ATTEMPTS = 5;
export const otpText = (code) => `[로컬브릿지AI_천안] 인증번호: ${code} (5분 안에 입력해 주세요)`;

export function newCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

// 호출자가 env.OTP_PEPPER를 넘긴다 (없으면 호출 전에 막는다)
export async function hash(s, pepper) {
  if (!pepper) throw new Error('pepper required');
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`${pepper}:${s}`)));
}

// inputHash = 호출자가 먼저 hash(code)로 계산. 만료 → 잠금 → 비교 순서.
export function checkOtp(row, inputHash, now) {
  if (now > row.expiresAt) return 'expired';
  if (row.attempts >= OTP_MAX_ATTEMPTS) return 'locked';
  return row.codeHash === inputHash ? 'ok' : 'wrong';
}
