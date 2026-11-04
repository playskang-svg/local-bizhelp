import test from 'node:test';
import assert from 'node:assert/strict';
import { messageBody } from '../src/lib/popbill.js';
test('LMS body', () => assert.deepEqual(messageBody({ sender: '0415550000', to: '01012345678', text: 'hi', subject: 's' }),
  { snd: '0415550000', subject: 's', content: 'hi', msgs: [{ rcv: '01012345678' }] }));
test('SMS body has no subject', () => assert.ok(!('subject' in messageBody({ sender: 'a', to: 'b', text: 'c' }))));
