-- ============================================
-- オシドリ MVP スキーマ
-- ============================================

-- ============================================
-- 1. shops（店舗）
-- ============================================
create table shops (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_name text not null,
  area text not null,
  category text not null,
  description text,
  address text,
  phone text,
  hours jsonb,
  holidays text,
  image_url text,
  owner_image_url text,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_shops_slug on shops(slug);
create index idx_shops_area on shops(area);
create index idx_shops_category on shops(category);
create index idx_shops_is_published on shops(is_published);

-- ============================================
-- 2. stories（ストーリー）
-- ============================================
create table stories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  title text not null,
  body text not null,
  summary text,
  key_quotes jsonb,
  emotion_tags jsonb,
  story_themes jsonb,
  status text default 'draft',
  published_at timestamptz,
  created_at timestamptz default now()
);

create index idx_stories_shop_id on stories(shop_id);
create index idx_stories_status on stories(status);

-- ============================================
-- 3. menus（食べてほしい一品）
-- ============================================
create table menus (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  price integer,
  description text,
  photo_url text,
  owner_message text,
  kodawari_text text,
  eating_tip text,
  kodawari_tags jsonb,
  is_ai_generated boolean default false,
  created_at timestamptz default now()
);

create index idx_menus_shop_id on menus(shop_id);

-- ============================================
-- 4. users（消費者）
-- ============================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 新規ユーザー登録時に自動でユーザーレコード作成
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', 'ユーザー')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 5. oshi_shops（推し店登録）
-- ============================================
create table oshi_shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  is_public boolean default true,
  created_at timestamptz default now(),
  unique(user_id, shop_id)
);

create index idx_oshi_shops_user_id on oshi_shops(user_id);
create index idx_oshi_shops_shop_id on oshi_shops(shop_id);

-- ============================================
-- 6. empathy_taps（共感タップ）
-- ============================================
create table empathy_taps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  story_id uuid not null references stories(id) on delete cascade,
  tag_type text not null,
  created_at timestamptz default now(),
  unique(user_id, story_id, tag_type)
);

create index idx_empathy_taps_story_id on empathy_taps(story_id);
create index idx_empathy_taps_user_id on empathy_taps(user_id);

-- ============================================
-- 7. ai_interviews（AIインタビュー）
-- ============================================
create table ai_interviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  status text default 'in_progress',
  current_phase integer default 1,
  transcript jsonb,
  engagement_context jsonb,
  duration_minutes integer,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_ai_interviews_shop_id on ai_interviews(shop_id);

-- ============================================
-- 8. interview_messages（メッセージ）
-- ============================================
create table interview_messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references ai_interviews(id) on delete cascade,
  role text not null,
  content text not null,
  phase integer,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_interview_messages_interview_id on interview_messages(interview_id);

-- ============================================
-- 9. photo_requests（撮影リクエスト）
-- ============================================
create table photo_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  interview_id uuid references ai_interviews(id),
  shots jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

create index idx_photo_requests_shop_id on photo_requests(shop_id);

-- ============================================
-- RLS（Row Level Security）
-- ============================================
alter table shops enable row level security;
alter table stories enable row level security;
alter table menus enable row level security;
alter table users enable row level security;
alter table oshi_shops enable row level security;
alter table empathy_taps enable row level security;
alter table ai_interviews enable row level security;
alter table interview_messages enable row level security;
alter table photo_requests enable row level security;

-- shops: is_published=true は誰でも閲覧可能
create policy "公開店舗は誰でも閲覧可" on shops
  for select using (is_published = true);

-- stories: status='published' は誰でも閲覧可能
create policy "公開ストーリーは誰でも閲覧可" on stories
  for select using (status = 'published');

-- menus: 公開店舗のメニューは誰でも閲覧可能
create policy "公開店舗のメニューは誰でも閲覧可" on menus
  for select using (
    exists (select 1 from shops where shops.id = menus.shop_id and shops.is_published = true)
  );

-- users: 自分のレコードのみ更新可能
create policy "ユーザーは自分のレコードを閲覧可" on users
  for select using (true);
create policy "ユーザーは自分のレコードのみ更新可" on users
  for update using (auth.uid() = id);

-- oshi_shops: 自分のレコードのみ作成・削除可能
create policy "推し店は誰でも閲覧可" on oshi_shops
  for select using (true);
create policy "ログインユーザーは推し店を追加可" on oshi_shops
  for insert with check (auth.uid() = user_id);
create policy "自分の推し店のみ削除可" on oshi_shops
  for delete using (auth.uid() = user_id);

-- empathy_taps: 自分のレコードのみ作成・削除可能
create policy "共感タップは誰でも閲覧可" on empathy_taps
  for select using (true);
create policy "ログインユーザーは共感タップ可" on empathy_taps
  for insert with check (auth.uid() = user_id);
create policy "自分の共感タップのみ削除可" on empathy_taps
  for delete using (auth.uid() = user_id);

-- ai_interviews: 閲覧のみ（管理用）
create policy "AIインタビューは関連店舗のみ閲覧可" on ai_interviews
  for select using (true);

-- interview_messages: 閲覧のみ
create policy "インタビューメッセージは閲覧可" on interview_messages
  for select using (true);

-- photo_requests: 閲覧のみ
create policy "撮影リクエストは閲覧可" on photo_requests
  for select using (true);

-- ============================================
-- updated_at 自動更新トリガー
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_shops_updated_at before update on shops
  for each row execute function update_updated_at();
