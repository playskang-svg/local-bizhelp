import { newToken, tokenHash } from './tokens.js';
import { newCode, hash, checkOtp, OTP_TTL_MS, OTP_MAX_ATTEMPTS } from './otp.js';
import { sendSMS } from './popbill.js';
import { chat as anthropicChat } from './anthropic.js';
import { applyUpdate, nextQuestion } from './landing-draft.js';
import { renderLanding } from '../pages/landing.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const err = (status, error) => json({ error }, status);
const body = (req) => req.json().then((b) => (b && typeof b === 'object' ? b : {}), () => ({}));
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const parse = (v, d) => { try { return JSON.parse(v) ?? d; } catch { return d; } };
const SMS_NEED = ['POPBILL_LINK_ID', 'POPBILL_SECRET_KEY', 'POPBILL_CORP_NUM', 'POPBILL_SENDER', 'OTP_PEPPER'];
const HELD = '확인 중이에요. 확인이 끝나면 안내해 드릴게요.';
const RETRY = '잠깐 문제가 생겼어요. 다시 말씀해 주세요';
const BAD_LINK = '수정 주소가 맞지 않아요. 문자로 새 주소를 받아 주세요.';
const COOLDOWN_MS = 60_000;

async function pre(req, env, need = []) {
  if (req.method !== 'POST') return err(405, '잘못된 요청이에요.');
  const missing = need.find((k) => !env[k]);
  if (missing) return err(503, `설정이 필요해요: ${missing}`);
  if (env.LIMIT && !(await env.LIMIT.limit({ key: req.headers.get('cf-connecting-ip') || 'local' })).success) {
    return err(429, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
  }
  return null;
}

async function byToken(env, token) {
  if (typeof token !== 'string' || !token || token.length > 100) return null;
  return env.D1.prepare('SELECT l.id, l.status, l.content, l.areas, l.game_consent AS gameConsent, b.name AS bizName FROM landings l LEFT JOIN businesses b ON b.id = l.business_id WHERE l.edit_token_hash = ?').bind(await tokenHash(token)).first();
}
const view = (row, content, areas) => ({
  draft: { ...content, areas }, preview: renderLanding({ name: row.bizName, content, areas }), next: nextQuestion({ ...content, areas }),
  status: row.status, gameConsent: !!row.gameConsent,
});

const SYSTEM = `당신은 동네 가게 대표님이 랜딩 페이지를 만들도록 돕는 도우미예요.
규칙:
- 해요체로 짧고 따뜻하게 말해요.
- 한 번에 한 가지만 물어봐요.
- 대표님이 말하지 않은 가격, 자격, 실적, 연도, 후기를 절대 지어내지 않아요.
- 매 답변마다 반드시 respond 도구를 한 번 불러요. reply에는 대표님께 보여 줄 말, update에는 이번 대화로 새로 알게 된 항목만 넣어요.
- update 키: name, tagline, intro, services[{title,detail}], excludes[string], extraCosts[{when,note}], hours, phone, channels{naverPlace,instagram,kakao,blog}, areas[동네 slug].
- 가게 이름은 인증된 값이라 대화로 바꿀 수 없어요. 바꿔 달라고 하면 정중히 어렵다고 말해요.
- 대표님이 "없어요"라고 하면 해당 배열을 빈 배열로 보내요.
- areas는 천안 동네 slug(예: dongnam-mokcheon-eup)만 써요.`;
const TOOL = {
  name: 'respond',
  description: '대표님께 답하고 랜딩 초안을 갱신해요',
  input_schema: { type: 'object', properties: { reply: { type: 'string' }, update: { type: 'object' } }, required: ['reply'] },
};

export async function landingState(req, env) {
  const bad = await pre(req, env);
  if (bad) return bad;
  const row = await byToken(env, (await body(req)).token);
  if (!row) return err(404, BAD_LINK);
  return json(view(row, parse(row.content, {}), parse(row.areas, [])));
}

// deps injectable for tests; production uses the default
export async function landingChat(req, env, deps = { chat: anthropicChat }) {
  const bad = await pre(req, env, ['ANTHROPIC_API_KEY']);
  if (bad) return bad;
  const b = await body(req);
  const row = await byToken(env, b.token);
  if (!row) return err(404, BAD_LINK);
  if (row.status === 'held') return err(403, HELD);
  const message = str(b.message, 1000);
  if (!message) return err(400, '말씀을 입력해 주세요.');
  const hist = (Array.isArray(b.history) ? b.history : []).slice(-24)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  while (hist.length && hist[0].role !== 'user') hist.shift();
  const content = parse(row.content, {});
  const areas = parse(row.areas, []);
  const nq = nextQuestion({ ...content, areas });
  let out = null;
  try {
    out = await deps.chat(env, {
      system: `${SYSTEM}\n현재 초안: ${JSON.stringify({ ...content, photos: undefined, areas })}\n다음에 물어볼 것: ${nq ?? '없음. 마무리 인사를 해요.'}`,
      messages: [...hist, { role: 'user', content: message }], tools: [TOOL],
    });
  } catch (e) { console.error('landing chat failed', String(e?.message).slice(0, 40)); } // status only, never content
  if (out?.refusal) console.error('landing chat refusal');
  if (!out || out.refusal) return json({ reply: RETRY, failed: true, ...view(row, content, areas) });
  if (!out.toolInput) return json({ reply: out.text || RETRY, failed: !out.text, ...view(row, content, areas) });
  const res = applyUpdate(content, out.toolInput.update);
  const newAreas = res.areas ?? areas;
  delete res.draft.photos;
  // photos come from the current DB value, so an upload during the model wait is never lost
  await env.D1.prepare("UPDATE landings SET content = json_set(?, '$.photos', COALESCE(json_extract(content, '$.photos'), json('[]'))), areas = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(res.draft), JSON.stringify(newAreas), new Date().toISOString(), row.id).run();
  const fresh = await env.D1.prepare('SELECT content FROM landings WHERE id = ?').bind(row.id).first();
  return json({ reply: str(out.toolInput.reply, 2000) || RETRY, ...view(row, parse(fresh.content, {}), newAreas) });
}

export async function landingPublish(req, env) {
  const bad = await pre(req, env);
  if (bad) return bad;
  const b = await body(req);
  const row = await byToken(env, b.token);
  if (!row) return err(404, BAD_LINK);
  if (row.status === 'held') return err(403, HELD);
  const iso = new Date().toISOString();
  // R18: edits on a published landing are already live; a repeat call only re-stamps reviewed_at
  await env.D1.prepare("UPDATE landings SET status = 'published', reviewed_at = ?, game_consent = ?, updated_at = ? WHERE id = ?")
    .bind(iso, b.gameConsent === true ? 1 : 0, iso, row.id).run();
  return json({ published: true });
}

const MAX_PHOTO = 8 * 1024 * 1024;
const MAX_PHOTOS = 10;
const MAX_BODY = 8.5 * 1024 * 1024;
function sniff(u8) {
  const eq = (o, bytes) => bytes.every((v, i) => u8[o + i] === v);
  if (eq(0, [0xff, 0xd8, 0xff])) return ['image/jpeg', 'jpg'];
  if (eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return ['image/png', 'png'];
  if (eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return ['image/webp', 'webp'];
  return null;
}

export async function landingPhoto(req, env) {
  const bad = await pre(req, env);
  if (bad) return bad;
  const len = Number(req.headers.get('content-length'));
  if (!len || len > MAX_BODY) return err(413, '사진은 8MB 이하로 올려 주세요.');
  let form;
  try { form = await req.formData(); } catch { return err(400, '사진을 다시 올려 주세요.'); }
  const row = await byToken(env, form.get('token'));
  if (!row) return err(404, BAD_LINK);
  if (row.status === 'held') return err(403, HELD);
  const file = form.get('file');
  if (!file || typeof file === 'string') return err(400, '사진을 골라 주세요.');
  if (file.size > MAX_PHOTO) return err(413, '사진은 8MB 이하로 올려 주세요.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return err(415, 'JPG, PNG, WEBP 사진만 올릴 수 있어요.');
  const key = `landings/${row.id}/${crypto.randomUUID()}.${kind[1]}`;
  await env.R2.put(key, bytes, { httpMetadata: { contentType: kind[0] } });
  // atomic append so parallel uploads do not drop each other
  // limit enforced inside the append so parallel uploads cannot exceed it
  const added = await env.D1.prepare("UPDATE landings SET content = json_set(COALESCE(content,'{}'), '$.photos', json_insert(COALESCE(json_extract(content,'$.photos'),'[]'), '$[#]', ?)), updated_at = ? WHERE id = ? AND json_array_length(COALESCE(json_extract(content,'$.photos'),'[]')) < ?")
    .bind(key, new Date().toISOString(), row.id, MAX_PHOTOS).run();
  if (!added.meta.changes) {
    await env.R2.delete(key);
    return err(400, '사진은 10장까지 올릴 수 있어요.');
  }
  const fresh = await env.D1.prepare('SELECT content, areas FROM landings WHERE id = ?').bind(row.id).first();
  return json({ key, ...view(row, parse(fresh.content, {}), parse(fresh.areas, [])) });
}

export async function mediaGet(env, key) {
  if (!/^landings\/\d+\/[\w-]+\.(jpg|png|webp)$/.test(key)) return null;
  const o = await env.R2.get(key);
  if (!o) return null;
  return new Response(o.body, { headers: { 'content-type': o.httpMetadata?.contentType || 'application/octet-stream', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' } });
}

// ---- relink: phone OTP -> NEW edit token (old one stops working) ----
const GENERIC = '등록된 번호라면 인증 문자를 보냈어요. 5분 안에 입력해 주세요.';
const RESTART = '처음부터 다시 해 주세요.';

export async function editLink(req, env, deps = { sendSMS }) {
  const bad = await pre(req, env, SMS_NEED);
  if (bad) return bad;
  const b = await body(req);
  return b.handle ? relinkConfirm(env, b) : relinkStart(env, b, deps);
}

async function relinkStart(env, b, deps) {
  const phone = str(b.phone, 20).replace(/\D/g, '');
  if (!/^01\d{8,9}$/.test(phone)) return err(400, '휴대폰 번호를 다시 확인해 주세요.');
  const phoneHash = await hash(phone, env.OTP_PEPPER);
  const now = Date.now();
  const iso = new Date(now).toISOString();
  if (env.LIMIT && !(await env.LIMIT.limit({ key: `p:${phoneHash}` })).success) return err(429, '잠시 뒤에 다시 받아 주세요.');
  const recent = await env.D1.prepare('SELECT 1 AS x FROM otps WHERE phone_hash = ? AND purpose = ? AND created_at > ? LIMIT 1')
    .bind(phoneHash, 'relink', new Date(now - COOLDOWN_MS).toISOString()).first();
  if (recent) return err(429, '잠시 뒤에 다시 받아 주세요.');
  const land = await env.D1.prepare('SELECT id FROM landings WHERE owner_phone = ? AND edit_token_hash IS NOT NULL ORDER BY id DESC LIMIT 1').bind(phone).first();
  // Unknown phone: decoy row (landingId null, random code, can never succeed), no SMS, same shape and cooldown.
  // The missing SMS round-trip is a timing difference we accept.
  const code = newCode();
  const secret = newToken();
  const ins = await env.D1.prepare(
    'INSERT INTO otps (phone_hash, code_hash, purpose, payload, expires_at, attempts, created_at, updated_at) VALUES (?,?,?,?,?,0,?,?)',
  ).bind(phoneHash, await hash(code, env.OTP_PEPPER), 'relink', JSON.stringify({ landingId: land?.id ?? null, handleHash: await tokenHash(secret) }), now + OTP_TTL_MS, iso, iso).run();
  const rowId = ins.meta.last_row_id;
  try {
    if (land) await deps.sendSMS(env, phone, `[로컬브릿지AI] 인증번호는 ${code}예요. 5분 안에 입력해 주세요.`);
  } catch {
    await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(rowId).run();
    return err(502, '인증 문자를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  await env.D1.prepare('DELETE FROM otps WHERE phone_hash = ? AND purpose = ? AND id != ?').bind(phoneHash, 'relink', rowId).run();
  return json({ handle: `${rowId}.${secret}`, message: GENERIC });
}

async function relinkConfirm(env, b) {
  const [idStr, secret = ''] = String(b.handle ?? '').split('.');
  const id = Number(idStr);
  const code = str(b.code, 10);
  if (!Number.isInteger(id) || !secret || secret.length > 64 || !/^\d{6}$/.test(code)) return err(400, '인증번호 6자리를 입력해 주세요.');
  const gone = () => err(404, `인증 요청을 찾지 못했어요. ${RESTART}`);
  const pre1 = await env.D1.prepare('SELECT payload FROM otps WHERE id = ? AND purpose = ?').bind(id, 'relink').first();
  if (!pre1 || parse(pre1.payload, {}).handleHash !== await tokenHash(secret)) return gone();
  const now = Date.now();
  const row = await env.D1.prepare(
    'UPDATE otps SET attempts = attempts + 1 WHERE id = ? AND purpose = ? AND attempts < ? AND expires_at > ? RETURNING code_hash AS codeHash, payload, attempts, expires_at AS expiresAt',
  ).bind(id, 'relink', OTP_MAX_ATTEMPTS, now).first();
  if (!row) {
    await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
    return err(410, `인증 시간이 지났거나 여러 번 틀렸어요. ${RESTART}`);
  }
  const landingId = parse(row.payload, {}).landingId;
  let res = checkOtp({ ...row, attempts: row.attempts - 1 }, await hash(code, env.OTP_PEPPER), now);
  if (landingId == null && res === 'ok') res = 'wrong'; // decoy rows can never succeed
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
  const used = await env.D1.prepare('DELETE FROM otps WHERE id = ?').bind(id).run();
  if (!used.meta.changes) return gone();
  const token = newToken();
  await env.D1.prepare('UPDATE landings SET edit_token_hash = ?, updated_at = ? WHERE id = ?')
    .bind(await tokenHash(token), new Date().toISOString(), landingId).run();
  return json({ editUrl: `/edit#t=${token}` });
}
