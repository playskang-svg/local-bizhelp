const H = 3600e3
const WEEK = 7 * 24 * H
const ms = (v) => (v == null || v === '' ? null : typeof v === 'number' ? v : Date.parse(v))
const inRange = (t, from, to) => t != null && !Number.isNaN(t) && t >= from && t <= to

export function computeMetrics({ inquiries = [], callClicks = [], landings = [], worklogs = [] }, { from, to, now }) {
  const valid = inquiries.filter((q) => q.valid && q.consent && inRange(ms(q.createdAt), from, to))
  let ackNum = 0, ackDen = 0
  for (const q of valid) {
    const created = ms(q.createdAt), ack = ms(q.ackAt)
    if (ack != null) { ackDen++; if (ack - created <= 24 * H) ackNum++ }
    else if (now - created >= 24 * H) ackDen++
  }
  const published = landings.filter((l) => l.status === 'published').length
  const minutes = worklogs
    .filter((w) => inRange(w.date ? ms(/^\d{4}-\d{2}-\d{2}$/.test(w.date) ? w.date + 'T00:00:00+09:00' : w.date) : ms(w.createdAt), from, to))
    .reduce((s, w) => s + (Number(w.minutes) || 0), 0)
  const weeks = Math.max((to - from) / WEEK, 1e-9)
  return {
    validInquiries: valid.length,
    regionLinked: valid.filter((q) => /^(isatips|magazine)-/.test(q.src || '')).length,
    ackRate24h: ackDen ? ackNum / ackDen : null,
    ackDenominator: ackDen,
    paid: landings.filter((l) => l.billing === 'paid').length,
    intent: landings.filter((l) => l.billing === 'intent').length,
    callClicks: callClicks.filter((c) => c.createdAt == null || inRange(ms(c.createdAt), from, to)).length,
    minutesPerLandingWeek: published ? minutes / published / weeks : 0,
  }
}
