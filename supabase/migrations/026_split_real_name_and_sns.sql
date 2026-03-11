-- ────────────────────────────────────────────
-- 026: 本名の姓名分割 + SNSカラム追加
-- ────────────────────────────────────────────

-- 1) 本名を姓・名に分割
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_real_name_sei text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_real_name_mei text;

-- 既存データのマイグレーション: スペース区切りで姓名を推定
UPDATE shops
SET
  owner_real_name_sei = CASE
    WHEN owner_real_name IS NOT NULL AND owner_real_name LIKE '% %'
    THEN split_part(owner_real_name, ' ', 1)
    WHEN owner_real_name IS NOT NULL AND owner_real_name LIKE '%　%'
    THEN split_part(owner_real_name, '　', 1)
    ELSE owner_real_name
  END,
  owner_real_name_mei = CASE
    WHEN owner_real_name IS NOT NULL AND owner_real_name LIKE '% %'
    THEN substring(owner_real_name FROM position(' ' IN owner_real_name) + 1)
    WHEN owner_real_name IS NOT NULL AND owner_real_name LIKE '%　%'
    THEN substring(owner_real_name FROM position('　' IN owner_real_name) + 1)
    ELSE NULL
  END
WHERE owner_real_name IS NOT NULL
  AND owner_real_name_sei IS NULL;

-- 2) SNSカラム追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS x_url text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS line_url text;
