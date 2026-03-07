#!/usr/bin/env node
/**
 * Populate story_themes, catchcopy_primary, hook_sentence into production DB
 * Also populate shop_basic_info with budget/genre data
 *
 * Usage: node scripts/populate-story-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Story data per shop slug
const STORY_DATA = [
  {
    slug: 'kuramae-yamato',
    story_themes: { origin: 5, food_craft: 5, community: 3, hospitality: 3, personality: 4, local_connection: 4, vision: 2 },
    catchcopy_primary: '祖父の石臼、朝4時の誓い',
    hook_sentence: '毎朝4時、石臼の音で一日が始まる。三代続くこだわりの蕎麦。',
  },
  {
    slug: 'kiyosumi-lien',
    story_themes: { origin: 4, food_craft: 4, community: 2, hospitality: 5, personality: 5, local_connection: 3, vision: 3 },
    catchcopy_primary: '素材と話す、パリ仕込みの一皿',
    hook_sentence: 'パリの路地裏で70歳のマダムに学んだ「レシピのない料理」。',
  },
  {
    slug: 'yoyogi-torishin',
    story_themes: { origin: 3, food_craft: 5, community: 2, hospitality: 3, personality: 4, local_connection: 2, vision: 3 },
    catchcopy_primary: '炭と鶏と、15年の真剣勝負',
    hook_sentence: '備長炭の機嫌を読み、宮崎の農家から届く鶏と向き合う。',
  },
  {
    slug: 'sangenjaya-mantra',
    story_themes: { origin: 5, food_craft: 4, community: 3, hospitality: 2, personality: 5, local_connection: 2, vision: 4 },
    catchcopy_primary: '3種のスパイスが生む、無限の味',
    hook_sentence: 'IT企業を辞め、インドの路上カレーに人生を賭けた男の一皿。',
  },
  {
    slug: 'kagurazaka-tsukishiro',
    story_themes: { origin: 4, food_craft: 5, community: 2, hospitality: 4, personality: 5, local_connection: 3, vision: 4 },
    catchcopy_primary: '引き算の美学、8席の覚悟',
    hook_sentence: '「女に和食は無理だ」。その言葉を跳ね返す、引き算の料理。',
  },
  {
    slug: 'kuramae-koku',
    story_themes: { origin: 4, food_craft: 5, community: 4, hospitality: 3, personality: 5, local_connection: 4, vision: 3 },
    catchcopy_primary: 'パン1個に3日。酵母との対話',
    hook_sentence: '自家製酵母の発酵に3日。その理由を聞いてくれた常連さんに感謝。',
  },
];

// Shop basic info per slug
const BASIC_INFO = [
  { slug: 'kuramae-yamato', budget_label_lunch: 'casual', budget_label_dinner: 'everyday', genre_primary: 'そば・うどん' },
  { slug: 'kiyosumi-lien', budget_label_lunch: 'everyday', budget_label_dinner: 'special', genre_primary: 'フレンチ', genre_secondary: 'ビストロ' },
  { slug: 'yoyogi-torishin', budget_label_dinner: 'everyday', genre_primary: '焼鳥' },
  { slug: 'sangenjaya-mantra', budget_label_lunch: 'everyday', budget_label_dinner: 'everyday', genre_primary: 'カレー', genre_secondary: 'エスニック' },
  { slug: 'kagurazaka-tsukishiro', budget_label_dinner: 'celebration', genre_primary: '和食' },
  { slug: 'kuramae-koku', budget_label_lunch: 'casual', genre_primary: 'パン' },
];

async function main() {
  console.log('🔄 Starting story data population...\n');

  // 1. Get all shop IDs by slug
  const { data: shops, error: shopError } = await supabase
    .from('shops')
    .select('id, slug, name')
    .in('slug', STORY_DATA.map((s) => s.slug));

  if (shopError) {
    console.error('❌ Failed to fetch shops:', shopError);
    process.exit(1);
  }

  if (!shops || shops.length === 0) {
    console.error('❌ No shops found. Make sure shops exist in the database.');
    process.exit(1);
  }

  const slugToShop = new Map(shops.map((s) => [s.slug, s]));
  console.log(`📍 Found ${shops.length} shops: ${shops.map(s => s.name).join(', ')}\n`);

  // 2. Update stories with themes, catchcopy, hook
  let storyUpdated = 0;
  for (const sd of STORY_DATA) {
    const shop = slugToShop.get(sd.slug);
    if (!shop) {
      console.warn(`⚠️  Shop not found: ${sd.slug}`);
      continue;
    }

    // Get the latest story for this shop
    const { data: stories } = await supabase
      .from('stories')
      .select('id, title')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!stories || stories.length === 0) {
      console.warn(`⚠️  No stories for ${sd.slug}`);
      continue;
    }

    const story = stories[0];
    const { error: updateError } = await supabase
      .from('stories')
      .update({
        story_themes: sd.story_themes,
        catchcopy_primary: sd.catchcopy_primary,
        hook_sentence: sd.hook_sentence,
      })
      .eq('id', story.id);

    if (updateError) {
      console.error(`❌ Failed to update story for ${sd.slug}:`, updateError);
    } else {
      storyUpdated++;
      console.log(`✅ ${shop.name}: "${sd.catchcopy_primary}" (themes updated)`);
    }
  }

  console.log(`\n📊 Stories updated: ${storyUpdated}/${STORY_DATA.length}\n`);

  // 3. Upsert shop_basic_info
  let infoUpdated = 0;
  for (const bi of BASIC_INFO) {
    const shop = slugToShop.get(bi.slug);
    if (!shop) continue;

    const record = {
      shop_id: shop.id,
      budget_label_lunch: bi.budget_label_lunch ?? null,
      budget_label_dinner: bi.budget_label_dinner ?? null,
      genre_primary: bi.genre_primary ?? null,
      genre_secondary: bi.genre_secondary ?? null,
    };

    const { error: upsertError } = await supabase
      .from('shop_basic_info')
      .upsert(record, { onConflict: 'shop_id' });

    if (upsertError) {
      console.error(`❌ Failed to upsert basic_info for ${bi.slug}:`, upsertError);
    } else {
      infoUpdated++;
      console.log(`✅ ${shop.name}: genre=${bi.genre_primary}, budget=${bi.budget_label_lunch ?? '-'}/${bi.budget_label_dinner ?? '-'}`);
    }
  }

  console.log(`\n📊 Basic info updated: ${infoUpdated}/${BASIC_INFO.length}`);
  console.log('\n🎉 Done! Forecast data is now available.');
}

main().catch(console.error);
