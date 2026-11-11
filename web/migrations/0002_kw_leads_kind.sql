-- 문의 방식: sms(문자 앱) | quote(견적 받기 링크)
ALTER TABLE kw_leads ADD COLUMN kind TEXT NOT NULL DEFAULT 'sms';
