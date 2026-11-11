import { listDongs } from '../db.js';
import { homePage } from '../kw/render.js';

// 첫 화면: 집수리 키워드·천안 지역 포털 + 우리 동네 업체·가게 등록(기존 기능)
export async function home(env, src) {
  return homePage(env, await listDongs(env), src);
}
