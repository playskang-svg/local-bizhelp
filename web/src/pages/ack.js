import { page } from '../html.js';
import { ackExists } from '../lib/inquiry.js';

// GET never writes (link previews and prefetchers fetch it); the script / noscript form POSTs /api/ack.
export async function ackPage(env, token) {
  if (!(await ackExists(env, token))) return null;
  const res = page({ title: '확인했어요', desc: '', noindex: true, body: `<p class="lead">기록했어요. 손님께 연락해 주셔서 고마워요.</p>
<noscript><form method="post" action="/api/ack"><input type="hidden" name="token" value="${token}"><button class="btn" type="submit">연락했어요</button></form></noscript>
<script>fetch('/api/ack',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:${JSON.stringify(token)}})}).catch(function(){})</script>` });
  res.headers.set('cache-control', 'no-store');
  return res;
}
