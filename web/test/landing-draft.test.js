import test from 'node:test';
import assert from 'node:assert/strict';
import { applyUpdate, nextQuestion } from '../src/lib/landing-draft.js';

test('ignores unknown keys and non-https urls', () => {
  const { draft } = applyUpdate({}, { evil: 1, channels: { instagram: 'javascript:alert(1)', blog: 'https://b.kr' } });
  assert.equal(draft.evil, undefined); assert.equal(draft.channels.instagram, undefined); assert.equal(draft.channels.blog, 'https://b.kr/');
});
test('areas keep only known dong slugs', () => {
  assert.deepEqual(applyUpdate({}, { areas: ['dongnam-mokcheon-eup', 'seoul-gangnam'] }).areas, ['dongnam-mokcheon-eup']);
});
test('asks for excludes after services', () => {
  assert.match(nextQuestion({ services: [{ title: '입주청소', detail: '베란다 포함' }] }), /하지 않는|빼는/);
});
test('no tool call keeps draft', () => {
  const d = { intro: 'a' }; assert.deepEqual(applyUpdate(d, undefined).draft, d);
});
test('clamps long strings and arrays; photos not settable', () => {
  const { draft } = applyUpdate({}, { intro: 'a'.repeat(900), excludes: Array(30).fill('x'), photos: ['landings/1/x.png'] });
  assert.equal(draft.intro.length, 600); assert.equal(draft.excludes.length, 20); assert.equal(draft.photos, undefined);
});
test('areas: dong names map to slugs, invented slugs dropped', () => {
  const r = applyUpdate({}, { areas: ['seobuk-buldang-dong', 'buldang-1-dong', '불당1동', '불당 2동', 'dongnam-mokcheon-eup'] });
  assert.deepEqual(r.areas, ['seobuk-buldang-1-dong', 'seobuk-buldang-2-dong', 'dongnam-mokcheon-eup']);
  assert.equal(r.draft.areasConfirmed, true);
});
test('areas: empty or all-unknown input is no update and never confirms', () => {
  for (const areas of [[], ['seobuk-buldang-dong', 'buldang-1-dong'], [1, null]]) {
    const r = applyUpdate({ intro: 'a' }, { areas });
    assert.equal('areas' in r, false, JSON.stringify(areas));
    assert.equal(r.draft.areasConfirmed, undefined);
  }
});
