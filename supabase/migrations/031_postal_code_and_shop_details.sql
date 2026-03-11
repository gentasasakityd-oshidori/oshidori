-- 031: 郵便番号・姓名分割・店舗詳細情報フィールド追加

-- ============================================================
-- 1. shop_role_applications: 姓名分割 + 郵便番号
-- ============================================================
ALTER TABLE shop_role_applications
  ADD COLUMN IF NOT EXISTS applicant_name_sei text,
  ADD COLUMN IF NOT EXISTS applicant_name_mei text,
  ADD COLUMN IF NOT EXISTS postal_code text;

COMMENT ON COLUMN shop_role_applications.applicant_name_sei IS '申請者の姓';
COMMENT ON COLUMN shop_role_applications.applicant_name_mei IS '申請者の名';
COMMENT ON COLUMN shop_role_applications.postal_code IS '郵便番号（ハイフンなし7桁）';

-- ============================================================
-- 2. shops: 郵便番号 + 店舗詳細情報
-- ============================================================
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS budget_lunch text,
  ADD COLUMN IF NOT EXISTS budget_dinner text,
  ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS service_charge text,
  ADD COLUMN IF NOT EXISTS total_seats integer,
  ADD COLUMN IF NOT EXISTS private_rooms text,
  ADD COLUMN IF NOT EXISTS rental_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_policy text,
  ADD COLUMN IF NOT EXISTS parking text,
  ADD COLUMN IF NOT EXISTS opening_date text;

COMMENT ON COLUMN shops.postal_code IS '郵便番号（ハイフンなし7桁）';
COMMENT ON COLUMN shops.budget_lunch IS 'ランチ予算帯';
COMMENT ON COLUMN shops.budget_dinner IS 'ディナー予算帯';
COMMENT ON COLUMN shops.payment_methods IS '支払い方法（JSON配列: ["現金","クレジットカード","電子マネー","QRコード決済"]等）';
COMMENT ON COLUMN shops.service_charge IS 'サービス料/チャージ（例: "なし", "10%", "お通し代300円"）';
COMMENT ON COLUMN shops.total_seats IS '総席数';
COMMENT ON COLUMN shops.private_rooms IS '個室情報（例: "あり（2〜6名）", "なし", "半個室あり"）';
COMMENT ON COLUMN shops.rental_available IS '貸切可否';
COMMENT ON COLUMN shops.smoking_policy IS '喫煙ポリシー（例: "全面禁煙", "分煙", "喫煙可"）';
COMMENT ON COLUMN shops.parking IS '駐車場情報（例: "あり（3台）", "なし", "近隣にコインパーキング"）';
COMMENT ON COLUMN shops.opening_date IS '開業日（例: "2020年4月", "2015年"）';

-- ============================================================
-- 3. shops: 最寄り駅情報（JSON形式）
-- ============================================================
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS nearest_stations jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN shops.nearest_stations IS '最寄り駅情報（JSON配列: [{"name":"大岡山","line":"東急目黒線","walking_minutes":3}]）';
