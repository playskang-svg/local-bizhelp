import { listDongs } from '../db.js';
import { homePage, mainPage } from '../kw/render.js';

// 첫 화면(/): 모든 지역을 아우르는 로컬브릿지 메인
export const main = (env, src) => mainPage(env, src);

// 천안 첫 화면(/cheonan): 집수리 키워드·천안 지역 포털 + 우리 동네 업체·가게 등록(기존 기능)
export async function home(env, src) {
  return homePage(env, await listDongs(env), src);
}
