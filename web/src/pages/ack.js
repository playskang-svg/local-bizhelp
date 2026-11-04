import { page } from '../html.js';
import { ackInquiry } from '../lib/inquiry.js';

export async function ackPage(env, token) {
  if (!(await ackInquiry(env, token))) return null;
  const res = page({ title: '확인했어요', desc: '', noindex: true, body: '<p class="lead">기록했어요. 손님께 연락해 주셔서 고마워요.</p>' });
  res.headers.set('cache-control', 'no-store');
  return res;
}
