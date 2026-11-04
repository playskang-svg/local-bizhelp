import test from 'node:test';
import assert from 'node:assert/strict';
import { applyUpdate, nextQuestion } from '../src/lib/landing-draft.js';

test('ignores unknown keys and non-https urls', () => {
  const { draft } = applyUpdate({}, { evil: 1, channels: { instagram: 'javascript:alert(1)', blog: 'https://b.kr' } });
  assert.equal(draft.evil, undefined); assert.equal(draft.channels.instagram, undefined); assert.equal(draft.channels.blog, 'https://b.kr');
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
