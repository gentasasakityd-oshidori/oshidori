-- 015: mood_tag を複数選択対応にする
-- 既存 mood_tag (text) はそのまま残し、新規 mood_tags (text[]) を追加
-- APIで両方を扱い、mood_tags を優先する

ALTER TABLE visit_records ADD COLUMN IF NOT EXISTS mood_tags text[];

-- 既存データを移行: mood_tag → mood_tags
UPDATE visit_records
SET mood_tags = ARRAY[mood_tag]
WHERE mood_tag IS NOT NULL AND mood_tags IS NULL;
