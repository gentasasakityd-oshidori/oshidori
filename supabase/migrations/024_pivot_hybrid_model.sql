-- 024: ピボット対応 — ハイブリッドインタビューモデル + AI進化基盤
-- pgvector拡張、プロンプトバージョン管理、評価パイプライン、事前調査・インタビュー設計書

-- ========================================
-- pgvector 拡張（Supabase で追加費用ゼロ）
-- ========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- プロンプトバージョン管理テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  prompt_type text NOT NULL CHECK (prompt_type IN (
    'interview_design',       -- インタビュー設計書生成
    'story_generation',       -- ストーリー生成
    'content_generation',     -- 日々のコンテンツ生成
    'ai_cm',                  -- AI CM提案
    'pre_research',           -- 事前調査
    'interview_system',       -- インタビューシステム
    'catchcopy',              -- キャッチコピー
    'menu_generation'         -- メニュー生成
  )),
  content text NOT NULL,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  deprecated_at timestamptz,
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);

COMMENT ON TABLE prompt_versions IS 'プロンプトバージョン管理。どのバージョンが高品質な出力を生成したかを追跡';
COMMENT ON COLUMN prompt_versions.prompt_type IS 'プロンプトの種類';
COMMENT ON COLUMN prompt_versions.performance_metrics IS '{"avg_quality_score", "approval_rate", "empathy_rate", "checkin_lift"}';

-- ========================================
-- stories テーブルに embedding + prompt_version_id を追加
-- ========================================
ALTER TABLE stories ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS prompt_version_id uuid REFERENCES prompt_versions(id);

COMMENT ON COLUMN stories.embedding IS 'ストーリーのベクトル埋め込み（意味的類似検索用）';
COMMENT ON COLUMN stories.prompt_version_id IS '生成に使用したプロンプトバージョン';

-- 類似検索インデックス
CREATE INDEX IF NOT EXISTS idx_stories_embedding ON stories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ========================================
-- 生成コンテンツ・評価パイプラインテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS generated_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN (
    'sns_post',           -- SNS投稿文
    'story_update',       -- ストーリー更新
    'community_message',  -- 常連向けメッセージ
    'menu_description',   -- メニュー説明文
    'seasonal_content'    -- 季節・イベント系コンテンツ
  )),
  content_body text NOT NULL,
  prompt_version_id uuid REFERENCES prompt_versions(id),
  situation_context jsonb DEFAULT '{}'::jsonb,
  -- 店主承認ステータス
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'edited', 'skipped'
  )),
  approved_at timestamptz,
  edited_body text,  -- 店主が編集した場合の修正版
  -- 3軸評価スコア
  sns_engagement jsonb DEFAULT '{}'::jsonb,       -- 短期: {"likes", "shares", "saves", "comments"}
  checkin_lift_7d decimal(5,2) DEFAULT 0.00,       -- 中期: 投稿後7日のチェックイン増減率
  oshi_registration_lift_7d decimal(5,2) DEFAULT 0.00, -- 長期: お気に入り登録増減率
  -- ベクトル埋め込み
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE generated_contents IS 'AI生成コンテンツとパフォーマンスログ。3軸評価スコアを自動付与';
COMMENT ON COLUMN generated_contents.situation_context IS '生成時の状況データ: {"source", "trigger", "season", "target_audience"}';
COMMENT ON COLUMN generated_contents.sns_engagement IS '短期評価: SNSエンゲージメント {"likes", "shares", "saves", "comments"}';
COMMENT ON COLUMN generated_contents.checkin_lift_7d IS '中期評価: 投稿後7日間のチェックイン増減率(%)';
COMMENT ON COLUMN generated_contents.oshi_registration_lift_7d IS '長期評価: 投稿後7日間のお気に入り登録増減率(%)';

-- ========================================
-- 事前調査レポートテーブル（AIエージェント自動調査結果）
-- ========================================
CREATE TABLE IF NOT EXISTS pre_research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  -- 情報源ごとのデータ
  instagram_data jsonb DEFAULT '{}'::jsonb,
  google_maps_data jsonb DEFAULT '{}'::jsonb,
  tabelog_data jsonb DEFAULT '{}'::jsonb,
  web_data jsonb DEFAULT '{}'::jsonb,
  -- AI分析結果
  personality_hypothesis jsonb DEFAULT '[]'::jsonb,   -- 店主の人柄仮説
  kodawari_hypothesis jsonb DEFAULT '[]'::jsonb,      -- こだわり軸仮説
  episode_hypothesis jsonb DEFAULT '[]'::jsonb,       -- エピソード仮説
  -- メタデータ
  research_status text NOT NULL DEFAULT 'pending' CHECK (research_status IN (
    'pending', 'in_progress', 'completed', 'failed'
  )),
  sources_checked text[] DEFAULT '{}',
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

COMMENT ON TABLE pre_research_reports IS 'AIエージェントによる事前調査レポート。SNS/Google Maps/食べログ等から情報収集';
COMMENT ON COLUMN pre_research_reports.personality_hypothesis IS '店主の人柄に関する仮説 [{"trait", "evidence", "confidence"}]';
COMMENT ON COLUMN pre_research_reports.kodawari_hypothesis IS 'こだわり軸に関する仮説 [{"axis", "evidence", "confidence"}]';
COMMENT ON COLUMN pre_research_reports.episode_hypothesis IS '深掘り可能なエピソード仮説 [{"topic", "evidence", "questions"}]';

-- ========================================
-- インタビュー設計書テーブル（AI生成質問リスト）
-- ========================================
CREATE TABLE IF NOT EXISTS interview_design_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  pre_research_id uuid REFERENCES pre_research_reports(id),
  -- 設計書内容
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,  -- 20問の質問リスト
  interview_strategy text,                        -- インタビュー戦略メモ
  focus_areas text[] DEFAULT '{}',                -- 重点的に深掘りすべきエリア
  estimated_duration_minutes integer DEFAULT 30,
  -- メタデータ
  prompt_version_id uuid REFERENCES prompt_versions(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'finalized', 'used', 'archived'
  )),
  used_at timestamptz,          -- 実際にインタビューで使用した日時
  interviewer_notes text,       -- インタビュアーの使用後メモ
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE interview_design_docs IS 'AI生成インタビュー設計書。事前調査に基づく質問リスト20問';
COMMENT ON COLUMN interview_design_docs.questions IS '[{"order", "phase", "question", "intent", "follow_up_hints", "priority"}]';

-- ========================================
-- ai_interviews テーブルに新フィールド追加（ハイブリッドモデル対応）
-- ========================================
ALTER TABLE ai_interviews ADD COLUMN IF NOT EXISTS interview_mode text DEFAULT 'ai_self'
  CHECK (interview_mode IN ('ai_self', 'hybrid', 'human_only'));
ALTER TABLE ai_interviews ADD COLUMN IF NOT EXISTS design_doc_id uuid REFERENCES interview_design_docs(id);
ALTER TABLE ai_interviews ADD COLUMN IF NOT EXISTS interviewer_id text;  -- 人間インタビュアーの識別子
ALTER TABLE ai_interviews ADD COLUMN IF NOT EXISTS audio_url text;       -- 音声録音URL
ALTER TABLE ai_interviews ADD COLUMN IF NOT EXISTS pre_research_id uuid REFERENCES pre_research_reports(id);

COMMENT ON COLUMN ai_interviews.interview_mode IS 'ai_self: AIセルフ完結 | hybrid: 人間+AI | human_only: 人間のみ';
COMMENT ON COLUMN ai_interviews.design_doc_id IS '使用したインタビュー設計書';
COMMENT ON COLUMN ai_interviews.interviewer_id IS '人間インタビュアーの識別子（バイトID等）';
COMMENT ON COLUMN ai_interviews.audio_url IS '音声録音ファイルのURL（Supabase Storage）';

-- ========================================
-- マイクロ入力テーブル（日々のコンテンツ生成のインプット）
-- ========================================
CREATE TABLE IF NOT EXISTS micro_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  input_type text NOT NULL CHECK (input_type IN (
    'voice_memo',      -- 音声メモ
    'text_memo',       -- テキストメモ
    'photo',           -- 写真
    'customer_voice',  -- お客さんの声
    'sns_post',        -- SNS投稿（Instagram連携）
    'seasonal_event'   -- 季節・イベント（AI自動検知）
  )),
  content text,
  audio_url text,             -- 音声メモのURL
  photo_url text,             -- 写真のURL
  transcription text,         -- 音声の書き起こし
  metadata jsonb DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE micro_inputs IS '店主からのマイクロ入力。日々のコンテンツ生成のインプットソース';
COMMENT ON COLUMN micro_inputs.input_type IS 'voice_memo: 音声30秒 | text_memo: 一言メモ | photo | customer_voice | sns_post | seasonal_event';

-- ========================================
-- インタビュアー管理テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS interviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  -- スキル・評価
  total_interviews integer NOT NULL DEFAULT 0,
  avg_story_quality_score decimal(3,2) DEFAULT 0.00,
  specialties text[] DEFAULT '{}',  -- 得意な業態 ["イタリアン", "和食" 等]
  -- ステータス
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE interviewers IS '人間インタビュアー管理。将来のAI化に向けたデータ蓄積元';
COMMENT ON COLUMN interviewers.avg_story_quality_score IS '担当インタビューから生成されたストーリーの平均品質スコア';

-- ========================================
-- インタビュアー行動ログ（AI化ロードマップ用データ蓄積）
-- ========================================
CREATE TABLE IF NOT EXISTS interviewer_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES ai_interviews(id) ON DELETE CASCADE,
  interviewer_id uuid NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE,
  -- 行動データ
  action_type text NOT NULL CHECK (action_type IN (
    'question_asked',     -- 質問した
    'follow_up',          -- 深掘りした
    'topic_change',       -- 話題を変えた
    'empathy_response',   -- 共感的応答
    'silence_handling',   -- 沈黙への対処
    'mood_shift',         -- 雰囲気の転換
    'note'                -- メモ
  )),
  content text,           -- 発言内容・メモ
  timestamp_in_interview integer,  -- インタビュー開始からの秒数
  result_quality text CHECK (result_quality IN ('excellent', 'good', 'neutral', 'poor')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE interviewer_action_logs IS '優秀なインタビュアーの行動パターンを蓄積。将来のAIインタビュアー化の学習データ';

-- ========================================
-- AI CM 行動データログ（学習メカニズム用）
-- ========================================
CREATE TABLE IF NOT EXISTS ai_cm_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  -- アクションデータ
  action_type text NOT NULL,  -- 送信したアクション種別
  action_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 結果データ
  result_type text,           -- 結果の種別
  result_value decimal(5,2),  -- 結果の数値（来店倍率、承認率等）
  result_detail jsonb DEFAULT '{}'::jsonb,
  -- タイミングデータ
  day_of_week integer,        -- 0-6 (日-土)
  hour_of_day integer,        -- 0-23
  -- 店主プロファイルスナップショット
  owner_profile_snapshot jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_cm_action_logs IS 'AI CMの提案→結果の紐付けデータ。行動データの動的プロンプト注入で精度向上';
COMMENT ON COLUMN ai_cm_action_logs.action_detail IS '{"proposal_type", "message_content", "target_user_id"}';
COMMENT ON COLUMN ai_cm_action_logs.result_detail IS '{"checkin_count", "response_time_hours", "sns_posted"}';
COMMENT ON COLUMN ai_cm_action_logs.owner_profile_snapshot IS '{"response_speed", "preferred_content_type", "notification_limit"}';

-- ========================================
-- インデックス
-- ========================================
CREATE INDEX IF NOT EXISTS idx_generated_contents_shop_id ON generated_contents(shop_id);
CREATE INDEX IF NOT EXISTS idx_generated_contents_type ON generated_contents(content_type);
CREATE INDEX IF NOT EXISTS idx_generated_contents_approval ON generated_contents(approval_status);
CREATE INDEX IF NOT EXISTS idx_generated_contents_embedding ON generated_contents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_pre_research_shop_id ON pre_research_reports(shop_id);
CREATE INDEX IF NOT EXISTS idx_pre_research_embedding ON pre_research_reports
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_interview_design_docs_shop_id ON interview_design_docs(shop_id);
CREATE INDEX IF NOT EXISTS idx_micro_inputs_shop_id ON micro_inputs(shop_id);
CREATE INDEX IF NOT EXISTS idx_micro_inputs_processed ON micro_inputs(processed);
CREATE INDEX IF NOT EXISTS idx_interviewer_action_logs_interview ON interviewer_action_logs(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_cm_action_logs_shop_id ON ai_cm_action_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_ai_cm_action_logs_timing ON ai_cm_action_logs(day_of_week, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_type ON prompt_versions(prompt_type);

-- ========================================
-- RLS
-- ========================================
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_design_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewer_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cm_action_logs ENABLE ROW LEVEL SECURITY;

-- prompt_versions: adminのみ全操作
CREATE POLICY "prompt_versions_admin_all" ON prompt_versions
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- prompt_versions: 全ユーザー読み取り可能
CREATE POLICY "prompt_versions_public_read" ON prompt_versions
  FOR SELECT USING (true);

-- generated_contents: 店舗オーナーは自店のコンテンツを操作可能
CREATE POLICY "generated_contents_owner_all" ON generated_contents
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- generated_contents: adminは全操作
CREATE POLICY "generated_contents_admin_all" ON generated_contents
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- pre_research_reports: 店舗オーナーは自店の調査結果を閲覧可能
CREATE POLICY "pre_research_owner_read" ON pre_research_reports
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- pre_research_reports: adminは全操作
CREATE POLICY "pre_research_admin_all" ON pre_research_reports
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- interview_design_docs: 店舗オーナーは自店の設計書を閲覧可能
CREATE POLICY "design_docs_owner_read" ON interview_design_docs
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- interview_design_docs: adminは全操作
CREATE POLICY "design_docs_admin_all" ON interview_design_docs
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- micro_inputs: 店舗オーナーは自店のマイクロ入力を操作可能
CREATE POLICY "micro_inputs_owner_all" ON micro_inputs
  FOR ALL USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- micro_inputs: adminは全操作
CREATE POLICY "micro_inputs_admin_all" ON micro_inputs
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- interviewers: adminのみ
CREATE POLICY "interviewers_admin_all" ON interviewers
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- interviewer_action_logs: adminのみ
CREATE POLICY "interviewer_action_logs_admin_all" ON interviewer_action_logs
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- ai_cm_action_logs: 店舗オーナーは自店のログを閲覧可能
CREATE POLICY "cm_action_logs_owner_read" ON ai_cm_action_logs
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- ai_cm_action_logs: adminは全操作
CREATE POLICY "cm_action_logs_admin_all" ON ai_cm_action_logs
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
