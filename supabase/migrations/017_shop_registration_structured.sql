-- 017: 店舗登録フォーム構造化フィールド追加
-- 住所の構造化、外部URL、最寄り駅徒歩分数

-- shops テーブルに構造化住所フィールド追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS address_prefecture TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS address_building TEXT;

-- 外部URLフィールド追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tabelog_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS gmb_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS website_url TEXT;

-- shop_basic_info に徒歩分数追加
ALTER TABLE shop_basic_info ADD COLUMN IF NOT EXISTS walking_minutes INTEGER;
