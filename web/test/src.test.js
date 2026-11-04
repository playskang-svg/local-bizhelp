import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSrc } from '../src/lib/src.js';

test('src normalize', () => {
  assert.equal(normalizeSrc('isatips-dongnam-mokcheon-eup'), 'isatips-dongnam-mokcheon-eup');
  assert.equal(normalizeSrc('<x>'), 'direct');
  assert.equal(normalizeSrc(undefined), 'direct');
  assert.equal(normalizeSrc('a'.repeat(41)), 'direct');
});
