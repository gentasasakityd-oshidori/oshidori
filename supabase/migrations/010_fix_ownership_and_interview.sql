-- ============================================
-- 010: 店舗所有権とインタビュー型の修正
-- ============================================

-- 1. shops テーブルに owner_id カラム追加
--    ユーザーと店舗を紐付けるための外部キー
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- owner_id のインデックス
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);

-- 2. ai_interviews テーブルに interview_type カラム追加
ALTER TABLE ai_interviews ADD COLUMN IF NOT EXISTS interview_type text DEFAULT 'initial_interview';

-- 3. RLSポリシー更新: 店舗オーナーは自分の店舗を管理可能
-- 既存の制限的なポリシーに加え、オーナーによる全操作を許可

-- shops: オーナーは自分の店舗を閲覧・更新・作成可能
CREATE POLICY "オーナーは自分の店舗を閲覧可" ON shops
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "オーナーは自分の店舗を更新可" ON shops
  FOR UPDATE USING (auth.uid() = owner_id);

-- stories: オーナーは自分の店舗のストーリーを管理可能
CREATE POLICY "オーナーは自店のストーリーを管理可" ON stories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = stories.shop_id AND shops.owner_id = auth.uid())
  );

-- menus: オーナーは自分の店舗のメニューを管理可能
CREATE POLICY "オーナーは自店のメニューを管理可" ON menus
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = menus.shop_id AND shops.owner_id = auth.uid())
  );

-- ai_interviews: オーナーは自分の店舗のインタビューを管理可能
CREATE POLICY "オーナーは自店のインタビューを管理可" ON ai_interviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = ai_interviews.shop_id AND shops.owner_id = auth.uid())
  );

-- interview_messages: オーナーは自分のインタビューのメッセージを管理可能
CREATE POLICY "オーナーはインタビューメッセージを管理可" ON interview_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_interviews
      JOIN shops ON shops.id = ai_interviews.shop_id
      WHERE ai_interviews.id = interview_messages.interview_id
      AND shops.owner_id = auth.uid()
    )
  );

-- photo_requests: オーナーは自分の店舗の撮影リクエストを管理可能
CREATE POLICY "オーナーは撮影リクエストを管理可" ON photo_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = photo_requests.shop_id AND shops.owner_id = auth.uid())
  );

-- shop_messages: オーナーは自分の店舗のメッセージを管理可能
CREATE POLICY "オーナーは自店のメッセージを管理可" ON shop_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_messages.shop_id AND shops.owner_id = auth.uid())
  );

-- shop_basic_info: オーナーは自分の店舗の基本情報を管理可能
CREATE POLICY "オーナーは自店の基本情報を管理可" ON shop_basic_info
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_basic_info.shop_id AND shops.owner_id = auth.uid())
  );

-- shop_structured_tags: オーナーは自分の店舗のタグを管理可能
CREATE POLICY "オーナーは自店のタグを管理可" ON shop_structured_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_structured_tags.shop_id AND shops.owner_id = auth.uid())
  );
