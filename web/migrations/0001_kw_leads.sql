-- 키워드 페이지 '체크하고 문자 보내기' 기록. 문자 본문은 방문자 휴대폰에서 바로 나가므로 전화번호·사진은 받지 않는다.
-- Payload가 관리하는 테이블과 섞이지 않게 web 전용 마이그레이션 테이블(web_d1_migrations)로 적용한다.
CREATE TABLE IF NOT EXISTS kw_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  group_slug TEXT NOT NULL,
  region_slug TEXT NOT NULL,
  work TEXT NOT NULL DEFAULT '[]',
  symptom TEXT NOT NULL DEFAULT '[]',
  area TEXT NOT NULL DEFAULT '[]',
  src TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS kw_leads_created ON kw_leads (created_at);
CREATE INDEX IF NOT EXISTS kw_leads_group_region ON kw_leads (group_slug, region_slug);
