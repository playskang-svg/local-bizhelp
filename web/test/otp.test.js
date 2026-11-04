import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOtp, newCode, hash } from '../src/lib/otp.js';
import { decideClaim } from '../src/lib/claim.js';
import { newToken, tokenHash } from '../src/lib/tokens.js';
test('otp expires after 5 min', () => assert.equal(checkOtp({ expiresAt: 1000, attempts: 0, codeHash: 'x' }, '1', 1001), 'expired'));
test('otp locks after 5 wrong tries', () => assert.equal(checkOtp({ expiresAt: 9e12, attempts: 5, codeHash: 'x' }, '1', 0), 'locked'));
test('otp ok / wrong', () => {
  assert.equal(checkOtp({ expiresAt: 9e12, attempts: 0, codeHash: 'x' }, 'x', 0), 'ok');
  assert.equal(checkOtp({ expiresAt: 9e12, attempts: 4, codeHash: 'x' }, 'y', 0), 'wrong');
});
test('code is 6 digits, hash depends on pepper', async () => {
  assert.match(newCode(), /^\d{6}$/);
  assert.notEqual(await hash('123456', 'a'), await hash('123456', 'b'));
});
test('token is 43 base64url chars', async () => {
  assert.match(newToken(), /^[A-Za-z0-9_-]{43}$/);
  assert.match(await tokenHash('t'), /^[0-9a-f]{64}$/);
});
test('second claim of a claimed shop is held', () => { assert.equal(decideClaim({ existingClaimed: true }), 'held'); assert.equal(decideClaim({ existingClaimed: false }), 'create'); });
