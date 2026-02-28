-- ============================================
-- API利用量・コスト追跡テーブル
-- ============================================
create table api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  estimated_cost_usd numeric(10,6) not null default 0,
  shop_id uuid references shops(id) on delete set null,
  interview_id uuid references ai_interviews(id) on delete set null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_api_usage_created on api_usage_logs(created_at);
create index idx_api_usage_endpoint on api_usage_logs(endpoint);
create index idx_api_usage_shop on api_usage_logs(shop_id);
create index idx_api_usage_interview on api_usage_logs(interview_id);
