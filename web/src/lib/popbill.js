// 팝빌 문자(SMS/LMS) 최소 클라이언트. 공식 Node SDK가 Workers에서 돌지 않아 LinkHub 인증을 직접 구현했다.
// 필요한 값: POPBILL_LINK_ID, POPBILL_SECRET_KEY, POPBILL_CORP_NUM, POPBILL_SENDER, POPBILL_TEST('true'면 테스트 서버)
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const request = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
const service = (env) => (env.POPBILL_TEST === 'true' ? 'POPBILL_TEST' : 'POPBILL');
const apiHost = (env) => (env.POPBILL_TEST === 'true' ? 'https://popbill-test.linkhub.co.kr' : 'https://popbill.linkhub.co.kr');

export async function token(env) {
  const sid = service(env);
  const body = JSON.stringify({ access_id: env.POPBILL_CORP_NUM, scope: ['member', '150', '151'] });
  const xDate = new Date().toISOString();
  const bodyDigest = b64(await crypto.subtle.digest('SHA-256', enc.encode(body)));
  const target = `POST\n${bodyDigest}\n${xDate}\n*\n2.0\n/${sid}/Token`;
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(env.POPBILL_SECRET_KEY), (c) => c.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64(await crypto.subtle.sign('HMAC', key, enc.encode(target)));
  const r = await request(`https://auth.linkhub.co.kr/${sid}/Token`, {
    method: 'POST',
    headers: { 'x-lh-date': xDate, 'x-lh-version': '2.0', 'x-lh-forwarded': '*', Authorization: `LINKHUB ${env.POPBILL_LINK_ID} ${sig}`, 'content-type': 'application/json' },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.session_token) throw new Error(`팝빌 인증 실패: ${j.code || r.status}`);
  return j.session_token;
}

export async function call(env, tk, method, path, body) {
  const headers = { Authorization: `Bearer ${tk}`, 'content-type': 'application/json;charset=utf-8' };
  if (env.POPBILL_USER_ID) headers['X-PB-UserID'] = env.POPBILL_USER_ID;
  const r = await request(apiHost(env) + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (typeof j.code === 'number' && j.code < 0)) throw new Error(`팝빌 ${path} 실패: ${j.code || r.status}`);
  return j;
}

export const messageBody = ({ sender, to, text, subject }) => ({
  snd: sender, ...(subject ? { subject } : {}), content: text, msgs: [{ rcv: to }],
});

// shortcut: message API shape not verified on a live Popbill account yet, confirm with POPBILL_TEST=true in Task 11
export const sendSMS = async (env, to, text) =>
  call(env, await token(env), 'POST', '/SMS', messageBody({ sender: env.POPBILL_SENDER, to, text }));
export const sendLMS = async (env, to, subject, text) =>
  call(env, await token(env), 'POST', '/LMS', messageBody({ sender: env.POPBILL_SENDER, to, text, subject }));
