-- 018: ファンクラブシステム
-- 1店舗1プラン制（3テンプレートから選んでカスタマイズ）

CREATE TABLE IF NOT EXISTS fan_club_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  template_base TEXT NOT NULL CHECK (template_base IN ('light', 'standard', 'premium')),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_shop_fan_club UNIQUE (shop_id)
);

-- RLSを有効化
ALTER TABLE fan_club_plans ENABLE ROW LEVEL SECURITY;

-- 公開読み取り（アクティブなプランのみ）
CREATE POLICY "アクティブなファンクラブプランは誰でも閲覧可"
  ON fan_club_plans FOR SELECT
  USING (is_active = true);

-- 店舗オーナーは自分の店舗のプランを管理可能
CREATE POLICY "店舗オーナーは自店のプランを作成可"
  ON fan_club_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops WHERE shops.id = fan_club_plans.shop_id AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "店舗オーナーは自店のプランを更新可"
  ON fan_club_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shops WHERE shops.id = fan_club_plans.shop_id AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "店舗オーナーは自店のプランを削除可"
  ON fan_club_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shops WHERE shops.id = fan_club_plans.shop_id AND shops.owner_id = auth.uid()
    )
  );
