-- 037: ファンクラブ特典管理拡張

-- 特典マスタ
CREATE TABLE IF NOT EXISTS fan_club_benefits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES fan_club_plans(id) ON DELETE CASCADE,
  benefit_name text NOT NULL,
  benefit_type text NOT NULL DEFAULT 'general', -- 'discount' | 'exclusive_menu' | 'event' | 'message' | 'general'
  schedule_type text DEFAULT 'always', -- 'always' | 'monthly' | 'seasonal' | 'one_time'
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fan_club_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_fan_club_benefits"
  ON fan_club_benefits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fan_club_plans fcp
      JOIN shops ON shops.id = fcp.shop_id
      WHERE fcp.id = fan_club_benefits.plan_id
        AND shops.owner_id = auth.uid()
    )
  );

-- 特典提供ログ
CREATE TABLE IF NOT EXISTS fan_club_benefit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  benefit_id uuid NOT NULL REFERENCES fan_club_benefits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provided_at timestamptz DEFAULT now(),
  note text
);

ALTER TABLE fan_club_benefit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_benefit_logs"
  ON fan_club_benefit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fan_club_benefits fcb
      JOIN fan_club_plans fcp ON fcp.id = fcb.plan_id
      JOIN shops ON shops.id = fcp.shop_id
      WHERE fcb.id = fan_club_benefit_logs.benefit_id
        AND shops.owner_id = auth.uid()
    )
  );

-- fan_club_plansに加入条件・カレンダー設定を追加
ALTER TABLE fan_club_plans
  ADD COLUMN IF NOT EXISTS join_conditions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calendar_config jsonb DEFAULT '{}'::jsonb;
