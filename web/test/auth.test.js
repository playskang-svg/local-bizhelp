import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { sign, unsign } from '../src/lib/auth.js';

const ON = { SESSION_SECRET: 's3cret', NAVER_CLIENT_ID: 'nid', NAVER_CLIENT_SECRET: 'nsec', GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gsec' };
const get = (env, path, headers = {}) => worker.fetch(new Request('https://local.bizhelp.kr' + path, { headers, redirect: 'manual' }), env);

test('signed session round-trips, rejects tampering and expiry', async () => {
  const t = await sign(ON, { id: '1', exp: Date.now() + 1000 });
  assert.equal((await unsign(ON, t)).id, '1');
  assert.equal(await unsign(ON, t.slice(0, -2) + 'xx'), null);
  assert.equal(await unsign({ SESSION_SECRET: 'other' }, t), null);
  assert.equal(await unsign(ON, await sign(ON, { id: '1', exp: Date.now() - 1 })), null);
});

test('/login shows free vs paid plans with the m.bizhelp.kr link', async () => {
  const h = await (await get({}, '/login')).text();
  assert.ok(h.includes('무료형') && h.includes('유료형') && h.includes('0원') && h.includes('월 10만 원'));
  assert.ok(h.includes('href="https://m.bizhelp.kr"'));
  assert.ok(h.includes('href="/start?r=cheonan"')); // 키 없으면 기존 휴대폰 인증 등록으로 이어짐
  assert.ok(!h.includes('href="/auth/naver"'));
});

test('/login with keys shows both login buttons', async () => {
  const h = await (await get(ON, '/login')).text();
  assert.ok(h.includes('href="/auth/naver"') && h.includes('href="/auth/google"'));
});

test('/start is open without keys, gated to /login with keys', async () => {
  assert.equal((await get({}, '/start')).status, 200);
  const r = await get(ON, '/start');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), 'https://local.bizhelp.kr/login');
  const s = await sign(ON, { p: 'naver', id: '9', n: '홍', exp: Date.now() + 1e5 });
  assert.notEqual((await get(ON, '/start', { cookie: `lb_s=${s}` })).headers.get('location'), 'https://local.bizhelp.kr/login');
});

test('naver callback: state must match, then sets session and goes to /start', async () => {
  const start = await get(ON, '/auth/naver');
  const loc = new URL(start.headers.get('location'));
  assert.equal(loc.origin + loc.pathname, 'https://nid.naver.com/oauth2.0/authorize');
  const state = loc.searchParams.get('state');
  assert.ok(start.headers.get('set-cookie').includes(`lb_st=${state}`));

  const { authCallback } = await import('../src/lib/auth.js');
  const fake = async (u) => new Response(JSON.stringify(u.includes('token') ? { access_token: 'at' } : { response: { id: 'n1', name: '홍길동' } }));
  const req = (st) => new Request(`https://local.bizhelp.kr/auth/naver/callback?code=c&state=${st}`, { headers: { cookie: `lb_st=${state}` } });
  const bad = await authCallback(req('wrong'), ON, 'naver', fake);
  assert.equal(bad.headers.get('location'), '/login?e=fail');
  const ok = await authCallback(req(state), ON, 'naver', fake);
  assert.equal(ok.headers.get('location'), '/start?r=cheonan');
  const sess = ok.headers.getSetCookie().find((c) => c.startsWith('lb_s=')).split(';')[0].slice(5);
  assert.equal((await unsign(ON, sess)).n, '홍길동');
});

test('auth routes without keys fall back to /login', async () => {
  assert.equal((await get({}, '/auth/google')).headers.get('location'), '/login?e=off');
});
