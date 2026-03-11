-- 035: エンゲージメント機能（ストリーク+デイリーレコメンド）

-- ユーザーの連続活動ストリーク
CREATE TABLE IF NOT EXISTS user_engagement_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_engagement_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_streak"
  ON user_engagement_streaks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_upsert_own_streak"
  ON user_engagement_streaks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_streak"
  ON user_engagement_streaks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 日替わりレコメンド
CREATE TABLE IF NOT EXISTS daily_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  is_clicked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, shop_id)
);

ALTER TABLE daily_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_recommendations"
  ON daily_recommendations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_update_own_recommendations"
  ON daily_recommendations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_daily_recommendations_user_date
  ON daily_recommendations (user_id, date);
