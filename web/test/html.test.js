import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, page, cleanSrc, withSrc } from '../src/html.js';

test('esc escapes html', () => assert.equal(esc(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;'));
test('page sets noindex header when asked', async () => {
  const r = page({ title: 't', desc: 'd', body: '', noindex: true });
  assert.equal(r.headers.get('x-robots-tag'), 'noindex');
  assert.match(await r.text(), /<meta name="robots" content="noindex">/);
});
test('page escapes title', async () => {
  assert.match(await page({ title: '<x>', desc: '', body: '' }).text(), /&lt;x&gt;/);
});
test('src filter', () => {
  assert.equal(cleanSrc('a-1'), 'a-1');
  assert.equal(cleanSrc('A b'), '');
  assert.equal(withSrc('/d/x', 'a-1'), '/d/x?src=a-1');
  assert.equal(withSrc('/d/x', ''), '/d/x');
});
