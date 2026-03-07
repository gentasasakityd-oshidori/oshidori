-- 019: メニューストーリー機能強化（v6.1）
-- メニューテーブルに menu_story カラムと interview_id 参照を追加

-- メニューストーリー（200-400文字のナラティブテキスト）
ALTER TABLE menus ADD COLUMN IF NOT EXISTS menu_story text;

-- メニュー追加インタビューとの紐付け
ALTER TABLE menus ADD COLUMN IF NOT EXISTS interview_id uuid REFERENCES ai_interviews(id);

-- メニュー価格カラム（既に存在する場合はスキップ）
ALTER TABLE menus ADD COLUMN IF NOT EXISTS price integer;

-- 主な食材（配列）
ALTER TABLE menus ADD COLUMN IF NOT EXISTS key_ingredients text[];

-- コメント
COMMENT ON COLUMN menus.menu_story IS 'AIインタビューから生成された200-400文字のメニューストーリー';
COMMENT ON COLUMN menus.interview_id IS 'メニュー追加インタビューのID';
COMMENT ON COLUMN menus.price IS 'メニュー価格（円）';
COMMENT ON COLUMN menus.key_ingredients IS '主な食材リスト';
