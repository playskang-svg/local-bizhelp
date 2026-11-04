import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMetrics, kstStart } from './metrics.mjs'

const H = 3600e3, now = Date.parse('2026-11-20T00:00:00Z');
test('young unacked inquiry is not counted against ack rate', () => {
  const m = computeMetrics({ inquiries: [
    { valid: true, consent: true, createdAt: now - 30 * H, ackAt: now - 29 * H, src: 'isatips-x' },
    { valid: true, consent: true, createdAt: now - 2 * H, ackAt: null, src: 'direct' },
  ], callClicks: [{ createdAt: now - H }, { createdAt: now - 2 * H }], landings: [], worklogs: [] }, { from: 0, to: now, now });
  assert.equal(m.validInquiries, 2); assert.equal(m.regionLinked, 1); assert.equal(m.ackDenominator, 1); assert.equal(m.ackRate24h, 1); assert.equal(m.callClicks, 2);
});
test('duplicates and test billing excluded', () => {
  const m = computeMetrics({ inquiries: [{ valid: false, consent: true, createdAt: now - 30 * H }],
    callClicks: [], landings: [{ billing: 'test' }, { billing: 'paid' }, { billing: 'intent' }], worklogs: [] }, { from: 0, to: now, now });
  assert.equal(m.validInquiries, 0); assert.equal(m.paid, 1); assert.equal(m.intent, 1);
  assert.equal(m.ackRate24h, null);
});
test('ISO strings, late ack, magazine src, worklog minutes per landing-week', () => {
  const iso = (t) => new Date(t).toISOString();
  const week = 7 * 24 * H;
  const m = computeMetrics({ inquiries: [
    { valid: true, consent: true, createdAt: iso(now - 30 * H), ackAt: iso(now - 2 * H), src: 'magazine-a' },
    { valid: true, consent: false, createdAt: iso(now - 30 * H), src: 'isatips-x' },
  ], callClicks: [], landings: [{ status: 'published' }, { status: 'published' }, { status: 'draft' }],
  worklogs: [{ minutes: 60, createdAt: iso(now - 1 * H) }, { minutes: 999, createdAt: iso(now - 3 * week) }] },
  { from: now - 2 * week, to: now, now });
  assert.equal(m.validInquiries, 1); assert.equal(m.regionLinked, 1);
  assert.equal(m.ackDenominator, 1); assert.equal(m.ackRate24h, 0);
  assert.equal(m.minutesPerLandingWeek, 15); // 60 / 2 landings / 2 weeks
});

test('worklogs window uses date field, createdAt only as fallback', () => {
  const week = 7 * 24 * H;
  const m = computeMetrics({ inquiries: [], callClicks: [], landings: [{ status: 'published' }],
    worklogs: [
      { minutes: 10, date: '2026-11-19', createdAt: now - 10 * week }, // in window by date
      { minutes: 100, date: '2026-09-01', createdAt: now - 1 * H },    // out by date
      { minutes: 20, date: '', createdAt: now - 1 * H },               // fallback
    ] }, { from: now - week, to: now, now });
  assert.equal(m.minutesPerLandingWeek, 30);
});

test('kstStart: date-only is KST midnight, invalid is null', () => {
  assert.equal(kstStart('2026-11-04'), Date.parse('2026-11-03T15:00:00Z'));
  assert.equal(kstStart('2026-11-04T01:00:00Z'), Date.parse('2026-11-04T01:00:00Z'));
  assert.equal(kstStart('nope'), null); assert.equal(kstStart(undefined), null);
});
test('weeks floored at 1; malformed worklog date falls back to createdAt', () => {
  const m = computeMetrics({ inquiries: [], callClicks: [], landings: [{ status: 'published' }],
    worklogs: [{ minutes: 10, date: 'garbage', createdAt: now - H }] }, { from: now - H, to: now, now });
  assert.equal(m.minutesPerLandingWeek, 10);
});
test('out-of-window inquiry/click excluded; exactly 24h ack counts', () => {
  const m = computeMetrics({ inquiries: [
    { valid: true, consent: true, createdAt: now - 48 * H, ackAt: now - 24 * H },
    { valid: true, consent: true, createdAt: now - 100 * H, ackAt: now - 99 * H },
  ], callClicks: [{ createdAt: now - 100 * H }, {}, { createdAt: now - H }], landings: [], worklogs: [] }, { from: now - 60 * H, to: now, now });
  assert.equal(m.validInquiries, 1); assert.equal(m.ackRate24h, 1); assert.equal(m.callClicks, 1);
});
