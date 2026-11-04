import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretValidate } from '../src/lib/nts.js';
test('validate: valid + 계속사업자', () => assert.deepEqual(interpretValidate({ data: [{ valid: '01', status: { b_stt_cd: '01' } }] }), { ok: true }));
test('validate: mismatch', () => assert.deepEqual(interpretValidate({ data: [{ valid: '02' }] }), { ok: false, reason: 'mismatch' }));
test('validate: closed', () => assert.deepEqual(interpretValidate({ data: [{ valid: '01', status: { b_stt_cd: '03' } }] }), { ok: false, reason: 'closed' }));
test('validate: suspended', () => assert.deepEqual(interpretValidate({ data: [{ valid: '01', status: { b_stt_cd: '02' } }] }), { ok: false, reason: 'suspended' }));
