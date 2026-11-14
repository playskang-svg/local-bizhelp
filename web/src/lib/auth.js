import { newToken } from './tokens.js';
import { ORIGIN } from '../html.js';

// 구글·네이버 간편 로그인. 키(GOOGLE_*/NAVER_*)와 SESSION_SECRET 이 없으면 꺼진 상태로 두고, 기존 휴대폰 인증 등록이 그대로 동작한다.
export const PROVIDERS = {
  google: {
    label: '구글', idKey: 'GOOGLE_CLIENT_ID', secretKey: 'GOOGLE_CLIENT_SECRET',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token',
    profile: 'https://openidconnect.googleapis.com/v1/userinfo', extra: { scope: 'openid profile', response_type: 'code' },
    pick: (j) => ({ id: j.sub, name: j.name }),
  },
  naver: {
    label: '네이버', idKey: 'NAVER_CLIENT_ID', secretKey: 'NAVER_CLIENT_SECRET',
    authorize: 'https://nid.naver.com/oauth2.0/authorize', token: 'https://nid.naver.com/oauth2.0/token',
    profile: 'https://openapi.naver.com/v1/nid/me', extra: { response_type: 'code' },
    pick: (j) => ({ id: j.response?.id, name: j.response?.name || j.response?.nickname }),
  },
};

// 가입이 끝나면 m.bizhelp.kr 에서 무료 페이지를 만든다. 세션 쿠키는 .bizhelp.kr 전체에서 읽히고, m. 쪽이 같은 SESSION_SECRET 으로 검증한다.
export const NEXT = 'https://m.bizhelp.kr/free';
const SESSION_DAYS = 30;
const enc = new TextEncoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export const enabled = (env) => Object.keys(PROVIDERS).filter((k) => env[PROVIDERS[k].idKey] && env[PROVIDERS[k].secretKey]);
export const authOn = (env) => !!env.SESSION_SECRET && enabled(env).length > 0;

const key = (env, usage) => crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, usage);
export async function sign(env, payload) {
  const data = b64(enc.encode(JSON.stringify(payload)));
  return `${data}.${b64(new Uint8Array(await crypto.subtle.sign('HMAC', await key(env, ['sign']), enc.encode(data))))}`;
}
export async function unsign(env, token) {
  const [data, sig] = String(token || '').split('.');
  if (!data || !sig || !env.SESSION_SECRET) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await key(env, ['verify']), unb64(sig), enc.encode(data)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64(data)));
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

const cookie = (req, name) => (req.headers.get('cookie') || '').split(/;\s*/).map((c) => c.split(/=(.*)/s)).find(([k]) => k === name)?.[1] || '';
const setCookie = (name, value, maxAge) => `${name}=${value}; Path=/; Domain=.bizhelp.kr; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const redirect = (to, cookies = []) => {
  const h = new Headers({ location: to, 'cache-control': 'no-store' });
  cookies.forEach((c) => h.append('set-cookie', c));
  return new Response(null, { status: 302, headers: h });
};

export const getSession = (req, env) => unsign(env, cookie(req, 'lb_s'));

export async function authStart(env, name) {
  const p = PROVIDERS[name];
  if (!p || !enabled(env).includes(name) || !env.SESSION_SECRET) return redirect('/login?e=off');
  const state = newToken();
  const q = new URLSearchParams({ ...p.extra, client_id: env[p.idKey], redirect_uri: `${ORIGIN}/auth/${name}/callback`, state });
  return redirect(`${p.authorize}?${q}`, [setCookie('lb_st', state, 600)]);
}

// fetchFn 은 테스트에서 바꿔 끼운다.
export async function authCallback(req, env, name, fetchFn = fetch) {
  const p = PROVIDERS[name];
  const url = new URL(req.url);
  const state = url.searchParams.get('state'), code = url.searchParams.get('code');
  const clear = setCookie('lb_st', '', 0);
  if (!p || !enabled(env).includes(name) || !env.SESSION_SECRET) return redirect('/login?e=off', [clear]);
  if (!code || !state || state !== cookie(req, 'lb_st')) return redirect('/login?e=fail', [clear]);
  try {
    const t = await (await fetchFn(p.token, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, state, client_id: env[p.idKey], client_secret: env[p.secretKey], redirect_uri: `${ORIGIN}/auth/${name}/callback` }),
    })).json();
    if (!t.access_token) return redirect('/login?e=fail', [clear]);
    const u = p.pick(await (await fetchFn(p.profile, { headers: { authorization: `Bearer ${t.access_token}` } })).json());
    if (!u.id) return redirect('/login?e=fail', [clear]);
    const s = await sign(env, { p: name, id: String(u.id), n: String(u.name || '').slice(0, 30), exp: Date.now() + SESSION_DAYS * 864e5 });
    return redirect(NEXT, [clear, setCookie('lb_s', s, SESSION_DAYS * 86400)]);
  } catch { return redirect('/login?e=fail', [clear]); }
}

export const logout = () => redirect('/login', [setCookie('lb_s', '', 0)]);
