import test from 'node:test';
import assert from 'node:assert/strict';
import { validBizNo } from '../src/lib/bizno.js';
test('bizno checksum', () => { assert.equal(validBizNo('1234567890'), false); });
test('bizno valid sample', () => { assert.equal(validBizNo('1234567891'), true); assert.equal(validBizNo('1208800767'), true); assert.equal(validBizNo('120-88-00767'), true); assert.equal(validBizNo('12345'), false); });
