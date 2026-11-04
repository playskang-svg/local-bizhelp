import test from 'node:test'; import assert from 'node:assert/strict';
import dongs from './dongs.json' with { type: 'json' };
test('31 dongs, 17 dongnam + 14 seobuk', () => {
  assert.equal(dongs.length, 31);
  assert.equal(dongs.filter(d => d.gu === 'dongnam').length, 17);
  assert.equal(new Set(dongs.map(d => d.slug)).size, 31);
});
test('slug derives from isatips slug', () => {
  const d = dongs.find(x => x.name === '목천읍');
  assert.equal(d.slug, 'dongnam-mokcheon-eup');
  assert.equal(d.isatipsSlug, 'cheonan-dongnam-mokcheon-eup-moving');
});
