import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMetrics } from './metrics.mjs'

const H = 3600e3, now = Date.parse('2026-11-20T00:00:00Z');
test('young unacked inquiry is not counted against ack rate', () => {
  const m = computeMetrics({ inquiries: [
    { valid: true, consent: true, createdAt: now - 30 * H, ackAt: now - 29 * H, src: 'isatips-x' },
    { valid: true, consent: true, createdAt: now - 2 * H, ackAt: null, src: 'direct' },
  ], callClicks: [{}, {}], landings: [], worklogs: [] }, { from: 0, to: now, now });
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
