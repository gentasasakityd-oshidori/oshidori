-- 021: AIコミュニティマネージャーシステム（v6.1 Phase 4）
-- AI CM提案テーブルと来店マイルストーンテーブルを作成

-- ========================================
-- ai_cm_proposals: AI CMが生成するアクション提案
-- ========================================
CREATE TABLE IF NOT EXISTS ai_cm_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- 提案タイプ
  proposal_type text NOT NULL CHECK (proposal_type IN (
    'welcome_message',       -- 新規推し登録者への歓迎メッセージ提案
    'milestone_celebration',  -- 来店マイルストーン到達時のお祝い提案
    'fan_letter_reply',       -- ファンレターへの返信提案
    'seasonal_update',        -- 季節の挨拶・メニュー更新提案
    'engagement_boost',       -- エンゲージメント低下時のアクション提案
    'story_follow_up',        -- インタビューストーリーに基づく追加コンテンツ提案
    'menu_highlight'          -- メニューハイライト提案
  )),

  -- 提案内容
  title text NOT NULL,                -- 提案タイトル（短文）
  description text NOT NULL,          -- 提案の説明（100-200文字）
  suggested_action text NOT NULL,     -- 具体的なアクション内容
  suggested_message text,             -- 提案メッセージ文面（店主が編集してそのまま使える）

  -- 関連エンティティ
  target_user_id uuid REFERENCES users(id), -- 対象ユーザー（特定ユーザー向けの場合）
  related_entity_type text,           -- 'visit_record' | 'fan_letter' | 'oshi_shop' | 'story' | 'menu'
  related_entity_id uuid,             -- 関連エンティティのID

  -- ステータス
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',     -- 未対応
    'accepted',    -- 採用（実行済み）
    'dismissed',   -- 却下
    'expired'      -- 期限切れ
  )),

  -- 優先度
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN (
    'high',        -- 即時対応推奨
    'normal',      -- 通常
    'low'          -- 余裕があれば
  )),

  -- トリガー情報
  trigger_source text NOT NULL,       -- 何がこの提案を生成したか
  trigger_data jsonb DEFAULT '{}',    -- トリガーの詳細データ

  -- メタデータ
  expires_at timestamptz,             -- 提案の有効期限
  accepted_at timestamptz,            -- 採用日時
  dismissed_at timestamptz,           -- 却下日時
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cm_proposals_shop_id ON ai_cm_proposals(shop_id);
CREATE INDEX IF NOT EXISTS idx_cm_proposals_status ON ai_cm_proposals(status);
CREATE INDEX IF NOT EXISTS idx_cm_proposals_shop_status ON ai_cm_proposals(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_cm_proposals_created_at ON ai_cm_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cm_proposals_priority ON ai_cm_proposals(priority);

-- RLS
ALTER TABLE ai_cm_proposals ENABLE ROW LEVEL SECURITY;

-- 店舗オーナーは自店の提案を閲覧・更新可能
CREATE POLICY "cm_proposals_owner_read" ON ai_cm_proposals
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "cm_proposals_owner_update" ON ai_cm_proposals
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- adminは全操作可能
CREATE POLICY "cm_proposals_admin_all" ON ai_cm_proposals
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ========================================
-- visit_milestones: 来店マイルストーン記録
-- ========================================
CREATE TABLE IF NOT EXISTS visit_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- マイルストーン情報
  milestone_type text NOT NULL CHECK (milestone_type IN (
    'first_visit',        -- 初来店
    'visits_3',           -- 3回目の来店
    'visits_5',           -- 5回目の来店
    'visits_10',          -- 10回目の来店
    'visits_20',          -- 20回目の来店
    'visits_50',          -- 50回目の来店
    'monthly_streak_3',   -- 3ヶ月連続来店
    'monthly_streak_6',   -- 6ヶ月連続来店
    'monthly_streak_12',  -- 1年連続来店
    'anniversary_1',      -- 初来店から1周年
    'oshi_registration'   -- 推し登録
  )),

  visit_count integer,                -- 到達時の来店回数
  achieved_at timestamptz NOT NULL DEFAULT now(),

  -- CM提案との紐付け
  proposal_id uuid REFERENCES ai_cm_proposals(id),

  -- 店主の対応
  celebrated boolean NOT NULL DEFAULT false,  -- お祝い済みかどうか
  celebration_message text,           -- 店主が送ったお祝いメッセージ

  created_at timestamptz NOT NULL DEFAULT now(),

  -- 同一ユーザー・店舗・タイプの重複防止
  CONSTRAINT visit_milestones_unique UNIQUE (user_id, shop_id, milestone_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_visit_milestones_shop_id ON visit_milestones(shop_id);
CREATE INDEX IF NOT EXISTS idx_visit_milestones_user_id ON visit_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_milestones_achieved_at ON visit_milestones(achieved_at DESC);

-- RLS
ALTER TABLE visit_milestones ENABLE ROW LEVEL SECURITY;

-- 店舗オーナーは自店のマイルストーンを閲覧可能
CREATE POLICY "milestones_owner_read" ON visit_milestones
  FOR SELECT USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- ユーザーは自分のマイルストーンを閲覧可能
CREATE POLICY "milestones_user_read" ON visit_milestones
  FOR SELECT USING (user_id = auth.uid());

-- adminは全操作可能
CREATE POLICY "milestones_admin_all" ON visit_milestones
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- コメント
COMMENT ON TABLE ai_cm_proposals IS 'AIコミュニティマネージャーが生成するアクション提案';
COMMENT ON TABLE visit_milestones IS 'ユーザーの来店マイルストーン記録（CM提案のトリガー）';
COMMENT ON COLUMN ai_cm_proposals.suggested_message IS '店主が編集してそのまま送信できる提案メッセージ文面';
COMMENT ON COLUMN ai_cm_proposals.trigger_source IS 'interview_complete | visit_milestone | daily_batch | fan_letter_received';
