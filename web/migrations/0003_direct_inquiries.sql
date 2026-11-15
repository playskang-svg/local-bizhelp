-- 직접 문의 폼(/api/direct-inquiry) 접수 기록. 업체로 자동 전달하지 않고 접수 기록만 보관한다(공개 업체 0).
-- 휴대폰 번호는 개인정보 처리방침의 손님 항목과 같고, 접수 1년 뒤 cron 이 삭제한다. Payload 테이블과 섞지 않는다.
CREATE TABLE IF NOT EXISTS direct_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  region_slug TEXT NOT NULL,
  group_slug TEXT NOT NULL,
  wish_date TEXT,
  phone TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 1,
  page TEXT NOT NULL DEFAULT '',
  src TEXT NOT NULL DEFAULT 'direct',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_content TEXT NOT NULL DEFAULT '',
  valid INTEGER NOT NULL DEFAULT 1,
  invalid_reason TEXT,
  status TEXT NOT NULL DEFAULT 'received'
);
CREATE INDEX IF NOT EXISTS direct_inquiries_created ON direct_inquiries (created_at);
CREATE INDEX IF NOT EXISTS direct_inquiries_phone ON direct_inquiries (phone, created_at);
