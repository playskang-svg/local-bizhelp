export function interpretValidate(j) {
  const d = j?.data?.[0];
  if (!d || d.valid !== '01') return { ok: false, reason: 'mismatch' };
  const st = d.status?.b_stt_cd;
  if (st === '03') return { ok: false, reason: 'closed' };
  if (st === '02') return { ok: false, reason: 'suspended' };
  return { ok: true };
}

export async function ntsValidate(env, { bNo, startDt, pNm, bNm = '' }) {
  const r = await fetch(`https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey=${encodeURIComponent(env.DATA_GO_KEY)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ businesses: [{ b_no: bNo, start_dt: startDt, p_nm: pNm, b_nm: bNm }] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`국세청 응답 ${r.status}`);
  return interpretValidate(await r.json());
}
