-- 店舗申請テーブルに住所・電話番号カラムを追加
-- 実在確認のため、申請時に住所と電話番号を取得する
-- 承認時にshopsテーブルにもコピーされる

ALTER TABLE shop_role_applications
  ADD COLUMN IF NOT EXISTS address_prefecture text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_building text,
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN shop_role_applications.address_prefecture IS '都道府県';
COMMENT ON COLUMN shop_role_applications.address_city IS '市区町村';
COMMENT ON COLUMN shop_role_applications.address_street IS '町名番地';
COMMENT ON COLUMN shop_role_applications.address_building IS '建物名（任意）';
COMMENT ON COLUMN shop_role_applications.phone IS '電話番号';
