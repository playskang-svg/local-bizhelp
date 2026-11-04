import React from 'react'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { computeMetrics } from '../../../shared/metrics.mjs'

const DAY = 24 * 3600e3
const TARGETS = { valid: 10, region: 5, ack: 0.8, paid: 3, minutes: 30 }

export default async function Metrics({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  if (!req.user) redirect('/admin/login')
  const { payload } = req

  const now = Date.now()
  const startEnv = Date.parse(process.env.TRACK_A_START ?? '')
  const startMissing = Number.isNaN(startEnv)
  const from = startMissing ? now - 56 * DAY : startEnv
  const to = now

  const all = (collection: 'inquiries' | 'call-clicks' | 'landings' | 'worklogs') =>
    payload.find({ collection, pagination: false, depth: 0, overrideAccess: false, user: req.user }).then((r) => r.docs as any[])
  const [inquiries, callClicks, landings, worklogs] = await Promise.all([
    all('inquiries'), all('call-clicks'), all('landings'), all('worklogs'),
  ])

  const range = { from, to, now }
  const total = computeMetrics({ inquiries, callClicks, landings, worklogs }, range)
  const pct = (r: number | null) => (r == null ? '—' : `${Math.round(r * 100)}%`)
  const min = (n: number) => `${Math.round(n * 10) / 10}분`
  const ok = (b: boolean) => (b ? '달성' : '진행 중')
  const rows: [string, string, string, string][] = [
    ['유효 문의', `${total.validInquiries}건`, `${TARGETS.valid}건 이상`, ok(total.validInquiries >= TARGETS.valid)],
    ['지역 페이지 경유 문의', `${total.regionLinked}건`, `${TARGETS.region}건 이상`, ok(total.regionLinked >= TARGETS.region)],
    ['24시간 내 응답률', `${pct(total.ackRate24h)} (대상 ${total.ackDenominator}건)`, '80% 이상', ok((total.ackRate24h ?? 0) >= TARGETS.ack)],
    ['유료 전환', `${total.paid}곳`, `${TARGETS.paid}곳 이상`, ok(total.paid >= TARGETS.paid)],
    ['업체당 관리시간(주)', min(total.minutesPerLandingWeek), `${TARGETS.minutes}분 이내`, ok(total.minutesPerLandingWeek <= TARGETS.minutes)],
  ]

  const byLanding = landings.map((l) => {
    const id = l.id
    const m = computeMetrics({
      inquiries: inquiries.filter((q) => q.landing === id),
      callClicks: callClicks.filter((c) => c.landing === id),
      landings: [l],
      worklogs: worklogs.filter((w) => w.landing === id),
    }, range)
    return { slug: l.slug as string, m }
  })

  const cell = { padding: '6px 12px', textAlign: 'left' as const, borderBottom: '1px solid var(--theme-elevation-100)' }
  return (
    <div style={{ padding: 'var(--base)' }}>
      <h1>8주 지표</h1>
      <p>
        {new Date(from).toLocaleDateString('ko-KR')} ~ {new Date(to).toLocaleDateString('ko-KR')} 기준이에요.
      </p>
      {startMissing && <p style={{ color: 'var(--theme-error-500)' }}>8주 시작일(TRACK_A_START)을 설정해 주세요.</p>}
      <table style={{ borderCollapse: 'collapse' }}>
        <thead><tr>{['지표', '현재', '목표', '상태'].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} style={cell}>{c}</td>)}</tr>)}</tbody>
      </table>
      <p>전화 클릭 {total.callClicks}회 (목표 없이 참고만 해요.)</p>
      <h2>랜딩별</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead><tr>{['랜딩', '유효 문의', '지역 경유', '24시간 응답률', '전화 클릭', '관리시간(주)'].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>
          {byLanding.map(({ slug, m }) => (
            <tr key={slug}>
              {[slug, `${m.validInquiries}건`, `${m.regionLinked}건`, pct(m.ackRate24h), `${m.callClicks}회`, min(m.minutesPerLandingWeek)].map((c, i) => <td key={i} style={cell}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
