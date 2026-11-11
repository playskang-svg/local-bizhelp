// 키워드·지역 페이지의 '등록 업체' 칸: 그 지역이 속한 행정동(읍·면)에 출장 가는 공개 랜딩.
import { publishedLandingsIn } from '../db.js';
import { dongSlugOf } from './render.js';

export async function kwShops(env, r) {
  const dong = dongSlugOf(r);
  return dong ? publishedLandingsIn(env, dong, null) : [];
}
