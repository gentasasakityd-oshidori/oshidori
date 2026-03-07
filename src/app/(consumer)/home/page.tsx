import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Heart, MessageCircle, BookOpen, MapPin, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublishedShops } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SearchBar } from "@/components/search-bar";
import { SmallCard } from "@/components/shop-cards/small-card";
import { HorizontalCard } from "@/components/shop-cards/horizontal-card";
import { THEME_TO_DISPLAY_TAG } from "@/lib/display-tags";
// AREAS is soft-deprecated; station-based search is primary
import type { ShopWithRelations } from "@/types/database";

export const metadata: Metadata = {
  title: "オシドリ | こだわりの飲食店と出会う",
  description:
    "点数や口コミではわからない、店主の想いとこだわり。AIが引き出すストーリーで、あなただけの推し店を見つけよう。",
  openGraph: {
    title: "オシドリ | こだわりの飲食店と出会う",
    description:
      "点数や口コミではわからない、店主の想いとこだわり。AIが引き出すストーリーで、あなただけの推し店を見つけよう。",
    url: "https://oshidori.vercel.app/home",
    type: "website",
  },
  alternates: {
    canonical: "https://oshidori.vercel.app/home",
  },
};

// テーマコレクション定義
const THEME_COLLECTIONS = [
  { themeKey: "food_craft", title: "職人の技を味わう", description: "素材と技術にこだわり抜いた一皿" },
  { themeKey: "origin", title: "物語のあるお店", description: "創業ストーリーに想いが詰まった名店" },
  { themeKey: "hospitality", title: "おもてなしの名店", description: "心配りが行き届く特別な時間" },
  { themeKey: "community", title: "街に愛されるお店", description: "地域との結びつきが生む温もり" },
] as const;


/** 季節キーワードマッピング（月 → 旬の食材・季節ワード） */
const SEASONAL_KEYWORDS: Record<number, { label: string; emoji: string; keywords: string[] }> = {
  1: { label: "冬の味覚", emoji: "❄️", keywords: ["牡蠣", "白子", "ふぐ", "河豚", "蟹", "カニ", "大根", "鍋", "粕汁", "おでん", "みかん", "金柑", "冬"] },
  2: { label: "早春の息吹", emoji: "🌱", keywords: ["菜の花", "ふきのとう", "春菊", "蕗", "いちご", "苺", "節分", "バレンタイン", "冬", "早春"] },
  3: { label: "春の訪れ", emoji: "🌸", keywords: ["桜", "さくら", "春キャベツ", "たけのこ", "筍", "菜の花", "ホタルイカ", "しらす", "新玉ねぎ", "春", "ひな祭り"] },
  4: { label: "春爛漫", emoji: "🌷", keywords: ["たけのこ", "筍", "山菜", "新茶", "桜えび", "しらす", "アスパラ", "春", "花見"] },
  5: { label: "初夏の恵み", emoji: "🍃", keywords: ["新茶", "そら豆", "枝豆", "鰹", "カツオ", "初鰹", "トマト", "新じゃが", "初夏"] },
  6: { label: "梅雨の楽しみ", emoji: "☔", keywords: ["梅", "鮎", "アユ", "枝豆", "とうもろこし", "トマト", "茄子", "ナス", "紫陽花", "梅雨", "夏"] },
  7: { label: "夏の旬", emoji: "🍉", keywords: ["鰻", "うなぎ", "枝豆", "トマト", "茄子", "ナス", "冷やし", "かき氷", "スイカ", "夏", "七夕"] },
  8: { label: "真夏の味覚", emoji: "☀️", keywords: ["鰻", "うなぎ", "桃", "とうもろこし", "冷やし", "そうめん", "ゴーヤ", "夏野菜", "夏"] },
  9: { label: "秋の入り口", emoji: "🍂", keywords: ["秋刀魚", "さんま", "松茸", "栗", "新米", "梨", "ぶどう", "秋", "お月見"] },
  10: { label: "秋の実り", emoji: "🍁", keywords: ["松茸", "栗", "さつまいも", "秋鮭", "柿", "きのこ", "銀杏", "秋", "紅葉"] },
  11: { label: "晩秋の味わい", emoji: "🍂", keywords: ["牡蠣", "蟹", "カニ", "りんご", "かぼちゃ", "南瓜", "新蕎麦", "柚子", "ゆず", "秋", "冬"] },
  12: { label: "冬のごちそう", emoji: "🎄", keywords: ["牡蠣", "白子", "ふぐ", "河豚", "蟹", "カニ", "鍋", "おでん", "年越し", "クリスマス", "冬"] },
};

/** テーマ別 相性理由テンプレート — 「あなたに合う理由」として表示 */
const COMPATIBILITY_REASON_TEMPLATES: Record<string, string> = {
  origin: "想いのこもったストーリー",
  food_craft: "食へのこだわりが魅力",
  community: "地域との深いつながり",
  hospitality: "温かいおもてなし",
  personality: "店主の人柄が素敵",
  local_connection: "地元に根ざした味わい",
  vision: "挑戦するこだわり",
};

/** テーマキーから相性理由テキストを取得 */
function getForecastReasonText(themeKey: string): string {
  return COMPATIBILITY_REASON_TEMPLATES[themeKey] ?? "こだわりのお店";
}

/** story_themesから最高スコアのテーマキーとスコアを取得
 *  エンゲージメント（oshi / empathy）でスコアにボーナスを付与
 */
function getTopTheme(shop: ShopWithRelations): { key: string; score: number } | null {
  const story = shop.stories[0];
  if (!story?.story_themes) return null;
  const themes = story.story_themes as Record<string, number>;
  let topKey: string | null = null;
  let topScore = 0;
  for (const [key, score] of Object.entries(themes)) {
    if (typeof score === "number" && score > topScore) {
      topScore = score;
      topKey = key;
    }
  }
  if (!topKey) return null;

  // エンゲージメントボーナス: oshi + empathy でスコアを最大 +2 補正
  const oshiCount = shop._count?.oshi ?? 0;
  const empathyCount = shop._count?.empathy ?? 0;
  const engagementBonus = Math.min(2, (oshiCount * 0.3 + empathyCount * 0.1));
  const adjustedScore = Math.min(10, topScore + engagementBonus);

  return { key: topKey, score: Math.round(adjustedScore * 10) / 10 };
}

/** shop -> display_tags の icon+label ペア
 *  優先順位: 1. structured_tags（店舗固有）→ 2. DB display_tags → 3. story_themes fallback
 */
function getDisplayTags(shop: ShopWithRelations): Array<{ icon: string; label: string }> {
  // 1. structured_tags（ShopStructuredTag[]）からの固有タグ（最大2つ）
  const story = shop.stories[0];
  if (shop.structured_tags && shop.structured_tags.length > 0) {
    const kodawari = shop.structured_tags.filter((t) => t.tag_category === "kodawari").map((t) => t.tag_value);
    const personality = shop.structured_tags.filter((t) => t.tag_category === "personality").map((t) => t.tag_value);
    const scene = shop.structured_tags.filter((t) => t.tag_category === "scene").map((t) => t.tag_value);
    const result: Array<{ icon: string; label: string }> = [];
    if (kodawari[0]) result.push({ icon: "🔥", label: kodawari[0] });
    if (personality[0]) result.push({ icon: "✨", label: personality[0] });
    if (result.length === 0 && scene[0]) result.push({ icon: "🏠", label: scene[0] });
    if (result.length >= 2) return result.slice(0, 2);
    // 不足分は下位のフォールバックで補完
    if (result.length === 1) {
      // DB display_tags から1つ補完
      if (shop.display_tags && shop.display_tags.length > 0) {
        result.push({ icon: shop.display_tags[0].icon, label: shop.display_tags[0].label });
        return result;
      }
    }
    if (result.length > 0) return result;
  }

  // 2. DB display_tags
  if (shop.display_tags && shop.display_tags.length > 0) {
    return shop.display_tags.slice(0, 2).map((t) => ({ icon: t.icon, label: t.label }));
  }

  // 3. fallback: story_themes から上位2つ
  if (!story?.story_themes) return [];
  const themes = story.story_themes as Record<string, number>;
  return Object.entries(themes)
    .filter(([key]) => key in THEME_TO_DISPLAY_TAG)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key]) => THEME_TO_DISPLAY_TAG[key]);
}

export default async function HomePage() {
  const shops = await getPublishedShops();

  // ログイン済みユーザーのコレクション数・共感履歴を取得
  let collectionCount = 0;
  let isLoggedIn = false;
  let hasEmpathyData = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const { count } = await supabase
        .from("oshi_shops")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      collectionCount = count ?? 0;

      // 共感タップ履歴があるかチェック
      const { count: empathyCount } = await supabase
        .from("empathy_taps")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      hasEmpathyData = (empathyCount ?? 0) > 0;
    }
  } catch {
    // 認証エラーは無視
  }

  // ストーリーを持つ店舗のみ
  const shopsWithStories = shops.filter((s) => s.stories.length > 0);

  // テーマ別の店舗グループ
  const shopsByTheme = new Map<string, ShopWithRelations[]>();
  for (const shop of shopsWithStories) {
    const topTheme = getTopTheme(shop);
    if (topTheme) {
      const list = shopsByTheme.get(topTheme.key) ?? [];
      list.push(shop);
      shopsByTheme.set(topTheme.key, list);
    }
  }

  // 週間ストーリー: publishedが新しい順で最大5件
  const weeklyStories = [...shopsWithStories]
    .sort((a, b) => {
      const dateA = a.stories[0]?.published_at ?? a.stories[0]?.created_at ?? "";
      const dateB = b.stories[0]?.published_at ?? b.stories[0]?.created_at ?? "";
      return dateB.localeCompare(dateA);
    })
    .slice(0, 5);

  // 駅別の店舗数（nearest_station優先、fallback: area）
  const stationShopCounts = new Map<string, number>();
  for (const shop of shops) {
    const station = (shop.basic_info as Record<string, unknown> | null)?.nearest_station as string | undefined ?? shop.area;
    if (station) {
      stationShopCounts.set(station, (stationShopCounts.get(station) ?? 0) + 1);
    }
  }
  const activeStations = Array.from(stationShopCounts.keys()).sort();

  // 今日のピックアップ（ランダム的に1店舗選出 — 日付ベースで安定化）
  const todayIndex = shopsWithStories.length > 0
    ? new Date().getDate() % shopsWithStories.length
    : 0;
  const pickupShop = shopsWithStories[todayIndex] ?? null;

  // パーソナルレコメンド取得（ログイン済みユーザーのみ）
  let personalRecommendations: ShopWithRelations[] = [];
  if (isLoggedIn) {
    try {
      const recResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://oshidori.vercel.app"}/api/recommendations/personal?limit=5`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (recResponse.ok) {
        const recData = await recResponse.json();
        if (recData.recommendations && recData.recommendations.length > 0) {
          // recommendations[].id から店舗詳細を取得
          const recShopIds = recData.recommendations.map((r: { id: string }) => r.id);
          const recShops = shops.filter((s) => recShopIds.includes(s.id));
          personalRecommendations = recShops;
        }
      }
    } catch {
      // パーソナルレコメンド取得失敗時は空配列のまま
    }
  }

  // 旬のおすすめ: 季節キーワードでフィルタ
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const seasonalInfo = SEASONAL_KEYWORDS[currentMonth] ?? SEASONAL_KEYWORDS[1];
  const seasonalShops = shopsWithStories.filter((shop) => {
    const storyBody = shop.stories[0]?.body ?? "";
    const menuTexts = shop.menus
      .map((m) => `${m.kodawari_text ?? ""} ${m.owner_message ?? ""} ${m.name ?? ""}`)
      .join(" ");
    const searchText = `${storyBody} ${menuTexts}`;
    return seasonalInfo.keywords.some((kw) => searchText.includes(kw));
  }).slice(0, 6);

  // 推し店の新着更新を取得（ログイン済みユーザーのみ）
  // TODO: getOshiShopsUpdates関数を実装する
  let oshiShopsUpdates: ShopWithRelations[] = [];

  return (
    <>
      {/* Section 1: ヒーロー — グラデーション背景 + 検索 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FEF3EC] via-[#FFF8F4] to-[#FFF0E6] px-4 pb-6 pt-8 md:py-10">
        {/* 背景デコレーション */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-amber-200/20 blur-2xl" />

        <div className="relative mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              NEW
            </span>
            <p className="text-[11px] font-medium tracking-wide text-primary/70">
              星評価じゃない、新しいお店探し
            </p>
          </div>
          <h1 className="mt-2 text-[22px] font-bold leading-tight md:text-[28px]">
            店主の<span className="text-primary">こだわり</span>と
            <br className="sm:hidden" />
            <span className="text-primary">ストーリー</span>で出会う
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#5D6D7E]">
            AIインタビューで引き出した店主の想いを読んで、
            <br className="sm:hidden" />
            点数ではなく「共感」でお店を選ぶ
          </p>
          <div className="mt-4">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* マイコレクション プログレス */}
      {isLoggedIn && (
        <section className="px-4 pt-4">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/oshi"
              className="flex items-center gap-3 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 transition-colors hover:border-orange-200"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-[#2C3E50]">
                    推し店
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {collectionCount}
                  </span>
                  <span className="text-xs text-muted-foreground">店</span>
                </div>
                {/* プログレスバー（次のマイルストーンまで） */}
                {(() => {
                  const milestones = [3, 5, 10, 20, 50];
                  const nextMilestone = milestones.find((m) => m > collectionCount) ?? 50;
                  const progress = Math.min((collectionCount / nextMilestone) * 100, 100);
                  return (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-orange-100">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {collectionCount >= 50
                          ? "コンプリート！"
                          : `あと${nextMilestone - collectionCount}店で${nextMilestone}店達成`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* パーソナルレコメンド（ログイン済み＋気分タグ設定済みの場合） */}
      {isLoggedIn && personalRecommendations.length > 0 && (
        <section className="px-4 py-5">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-[#2C3E50]">あなたにおすすめ</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              あなたの気分タグにマッチする店舗
            </p>
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none -mx-1 px-1 pr-8">
                {personalRecommendations.map((shop) => {
                  const topTheme = getTopTheme(shop);
                  const forecastScore = topTheme?.score ?? null;
                  const forecastReasonText = topTheme
                    ? getForecastReasonText(topTheme.key)
                    : null;
                  return (
                    <div key={shop.id} className="snap-start shrink-0 w-[44vw] max-w-[200px] min-w-[170px]">
                      <SmallCard
                        shopSlug={shop.slug}
                        shopName={shop.name}
                        area={shop.area}
                        imageUrl={shop.image_url}
                        catchcopy={
                          shop.stories[0]?.catchcopy_primary ??
                          shop.stories[0]?.title ??
                          null
                        }
                        displayTags={getDisplayTags(shop)}
                        forecastScore={forecastScore}
                        forecastReasonText={forecastReasonText}
                        budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                      />
                    </div>
                  );
                })}
              </div>
              {/* 右端フェードで「続きがある」ことを示す */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent" />
            </div>
          </div>
        </section>
      )}

      {/* 推し店の新着更新（ログイン済み＋推し店登録済みの場合） */}
      {isLoggedIn && oshiShopsUpdates.length > 0 && (
        <section className="px-4 py-5 bg-gradient-to-br from-orange-50/50 to-amber-50/30">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-[#2C3E50]">推し店の新着更新</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              あなたが推し登録したお店の最新情報
            </p>
            <div className="space-y-2">
              {oshiShopsUpdates.map((shop) => {
                const topTheme = getTopTheme(shop);
                const forecastScore = topTheme?.score ?? null;
                const forecastReasonText = topTheme
                  ? `${THEME_TO_DISPLAY_TAG[topTheme.key]?.label ?? "こだわり"}のお店`
                  : null;
                return (
                  <HorizontalCard
                    key={shop.id}
                    shopSlug={shop.slug}
                    shopName={shop.name}
                    area={shop.area}
                    imageUrl={shop.image_url}
                    hookSentence={
                      shop.stories[0]?.hook_sentence ??
                      shop.stories[0]?.summary ??
                      null
                    }
                    displayTags={getDisplayTags(shop)}
                    forecastScore={forecastScore}
                    forecastReasonText={forecastReasonText}
                    budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 今日のピックアップ */}
      {pickupShop && (
        <section className="px-4 py-5">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-[#2C3E50]">今日のピックアップ</h2>
            </div>
            <Link
              href={`/shops/${pickupShop.slug}`}
              className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="relative aspect-[21/9] w-full overflow-hidden">
                {pickupShop.image_url ? (
                  <>
                    <img
                      src={pickupShop.image_url}
                      alt={pickupShop.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/80 to-amber-500/60">
                    <span className="text-5xl">🍽</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-[11px] font-medium text-white/80">{pickupShop.area}</p>
                  <h3 className="mt-0.5 text-lg font-bold text-white drop-shadow-sm">
                    {pickupShop.name}
                  </h3>
                  {pickupShop.stories[0]?.catchcopy_primary && (
                    <p className="mt-1 text-[13px] leading-snug text-white/90 line-clamp-2 drop-shadow-sm">
                      {pickupShop.stories[0].catchcopy_primary}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex gap-2">
                  {getDisplayTags(pickupShop).map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 text-[11px] text-gray-500">
                      <span>{tag.icon}</span>
                      <span>{tag.label}</span>
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                  ストーリーを読む <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* 旬のおすすめ */}
      {seasonalShops.length > 0 && (
        <section className="px-4 py-5">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-1.5">
                  {seasonalInfo.emoji} {seasonalInfo.label}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  今の季節にぴったりのこだわり店
                </p>
              </div>
              <Link
                href="/explore"
                className="text-sm text-primary hover:underline shrink-0"
              >
                もっと見る
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none -mx-1 px-1 pr-8">
              {seasonalShops.map((shop) => (
                <div key={shop.id} className="snap-start shrink-0 w-[44vw] max-w-[200px] min-w-[170px]">
                  <SmallCard
                    shopSlug={shop.slug}
                    shopName={shop.name}
                    area={shop.area}
                    imageUrl={shop.image_url}
                    catchcopy={
                      shop.stories[0]?.catchcopy_primary ??
                      shop.stories[0]?.title ??
                      null
                    }
                    displayTags={getDisplayTags(shop)}
                    budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 2: オシドリ予報 */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-1.5">
              ☀️ あなたとの相性予報
            </h2>
            {shopsWithStories.length > 0 && (
              <Link
                href="/explore"
                className="text-sm text-primary hover:underline shrink-0"
              >
                すべて見る
              </Link>
            )}
          </div>

          {shopsWithStories.length > 0 ? (
            <>
              {/* パーソナライズ済み / 未パーソナライズ で説明文を分岐 */}
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  {hasEmpathyData
                    ? "あなたの好みに合いそうなお店をピックアップ"
                    : "ストーリーに共感するほど、相性予報の精度がアップ"}
                </p>
                <span className="text-[10px] text-primary/60 flex items-center gap-0.5 animate-pulse">
                  スワイプ →
                </span>
              </div>
              <div className="relative mt-3">
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none -mx-1 px-1 pr-8">
                  {shopsWithStories.map((shop) => {
                    const topTheme = getTopTheme(shop);
                    const forecastScore = topTheme?.score ?? null;
                    const forecastReasonText = topTheme
                      ? getForecastReasonText(topTheme.key)
                      : null;
                    return (
                      <div key={shop.id} className="snap-start shrink-0 w-[44vw] max-w-[200px] min-w-[170px]">
                        <SmallCard
                          shopSlug={shop.slug}
                          shopName={shop.name}
                          area={shop.area}
                          imageUrl={shop.image_url}
                          catchcopy={
                            shop.stories[0]?.catchcopy_primary ??
                            shop.stories[0]?.title ??
                            null
                          }
                          displayTags={getDisplayTags(shop)}
                          forecastScore={forecastScore}
                          forecastReasonText={forecastReasonText}
                          budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* 右端フェードで「続きがある」ことを示す */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent" />
              </div>

              {/* 未ログイン or 共感データなし → パーソナライズ誘導 */}
              {(!isLoggedIn || !hasEmpathyData) && (
                <div className="mt-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 px-3.5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">💫</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-[#2C3E50]">
                        あなただけの相性予報を作ろう
                      </p>
                      <p className="text-[10px] text-[#5D6D7E] mt-0.5">
                        ストーリーに共感するほど、相性の合うお店が見つかります
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-orange-500 shrink-0">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-200 text-[8px] font-bold">1</span>
                      読む
                      <span className="text-orange-300">→</span>
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-200 text-[8px] font-bold">2</span>
                      共感
                      <span className="text-orange-300">→</span>
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-200 text-[8px] font-bold">3</span>
                      UP
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 店舗が一切ない場合のフルempty state */
            <div className="mt-3 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 text-center">
              <span className="text-3xl">☀️</span>
              <p className="mt-2 text-[15px] font-bold text-[#2C3E50]">
                まもなくお店が登場します
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                こだわりのお店が続々参加予定！
              </p>
              <Button size="sm" className="mt-4 gap-1.5" asChild>
                <Link href="/explore">
                  <Sparkles className="h-3.5 w-3.5" />
                  お店を探す
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: テーマコレクション */}
      {THEME_COLLECTIONS.map((collection) => {
        const themeShops = shopsByTheme.get(collection.themeKey) ?? [];
        // フィーチャーで使った店舗は除外
        const filtered = themeShops.slice(0, 4);
        if (filtered.length === 0) return null;
        const themeTag = THEME_TO_DISPLAY_TAG[collection.themeKey];
        return (
          <section key={collection.themeKey} className="px-4 py-6">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {themeTag && <span className="mr-1">{themeTag.icon}</span>}
                    {collection.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {collection.description}
                  </p>
                </div>
                <Link
                  href={`/explore?theme=${collection.themeKey}`}
                  className="text-sm text-primary hover:underline shrink-0"
                >
                  すべて見る
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((shop) => (
                  <SmallCard
                    key={shop.id}
                    shopSlug={shop.slug}
                    shopName={shop.name}
                    area={shop.area}
                    imageUrl={shop.image_url}
                    catchcopy={
                      shop.stories[0]?.catchcopy_primary ??
                      shop.stories[0]?.title ??
                      null
                    }
                    displayTags={getDisplayTags(shop)}
                    budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Section 4: 今週のストーリー */}
      {weeklyStories.length > 0 && (
        <section className="bg-gray-50/50 px-4 py-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">新着おすすめストーリー</h2>
              <Link
                href="/explore"
                className="text-sm text-primary hover:underline"
              >
                すべて見る
              </Link>
            </div>
            <div className="mt-3">
              {weeklyStories.map((shop) => {
                const topTheme = getTopTheme(shop);
                const forecastScore = topTheme?.score ?? null;
                const forecastReasonText = topTheme
                  ? `${THEME_TO_DISPLAY_TAG[topTheme.key]?.label ?? "こだわり"}のお店`
                  : null;
                return (
                  <HorizontalCard
                    key={shop.id}
                    shopSlug={shop.slug}
                    shopName={shop.name}
                    area={shop.area}
                    imageUrl={shop.image_url}
                    hookSentence={
                      shop.stories[0]?.hook_sentence ??
                      shop.stories[0]?.summary ??
                      null
                    }
                    displayTags={getDisplayTags(shop)}
                    forecastScore={forecastScore}
                    forecastReasonText={forecastReasonText}
                    budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* フィード枯渇対策: 店舗数が少ない場合のCTA */}
      {shopsWithStories.length <= 3 && (
        <section className="px-4 py-4">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl border border-dashed border-primary/30 bg-warm/50 p-4 text-center">
              <p className="text-sm font-medium text-[#2C3E50]">
                新しいお店が続々参加中！
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                まだ出会っていないお店があるかも
              </p>
              <Button size="sm" variant="outline" className="mt-3" asChild>
                <Link href="/explore?sort=newest">新着順で探す</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Section 5: こんな気分のときに（ムードカード） */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-lg font-bold">こんな気分のときに</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: "ふらっと一杯", icon: "🍶", bg: "from-amber-50 to-orange-50", filter: "casual" },
              { label: "ご褒美ディナー", icon: "✨", bg: "from-rose-50 to-pink-50", filter: "special" },
              { label: "職人の技を堪能", icon: "🔥", bg: "from-slate-50 to-gray-100", filter: "food_craft" },
              { label: "隠れた名店", icon: "🚪", bg: "from-emerald-50 to-teal-50", filter: "local_connection" },
            ].map((mood) => (
              <Link
                key={mood.filter}
                href={mood.filter === "casual" || mood.filter === "special"
                  ? `/explore?budget=${mood.filter}`
                  : `/explore?theme=${mood.filter}`
                }
                className={`group flex flex-col items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br ${mood.bg} p-6 transition-all hover:shadow-md hover:-translate-y-0.5`}
              >
                <span className="text-2xl">{mood.icon}</span>
                <span className="text-sm font-medium text-[#2C3E50]">{mood.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 駅別クイックアクセス */}
      {activeStations.length > 0 && (
        <section className="bg-gray-50/60 px-4 py-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold">駅から探す</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {activeStations.map((station) => (
                <Link
                  key={station}
                  href={`/explore?station=${station}`}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-white px-3 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <span className="text-sm font-medium text-[#2C3E50] group-hover:text-primary transition-colors">
                    {station}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {stationShopCounts.get(station) ?? 0}店
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 6: オシドリとは */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-lg font-bold text-[#2C3E50]">
            オシドリとは？
          </h2>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            飲食店と食べる人の新しい関係をつくるプラットフォーム
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-orange-100">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold text-[#2C3E50]">店主の想いを物語に</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                AIインタビューで店主の言葉を引き出し、お店の魅力をストーリーに
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-100">
                <Heart className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="mt-3 font-semibold text-[#2C3E50]">共感で出会う</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                点数や口コミではなく、こだわりへの「共感」でお店を選ぶ新しい体験
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-cyan-100">
                <MessageCircle className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="mt-3 font-semibold text-[#2C3E50]">推しでつながる</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                好きなお店を推し登録。あなたの「推し」がお店に届く
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: 飲食店オーナーCTA */}
      <section className="bg-primary px-4 py-12 text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">飲食店オーナーの方へ</h2>
          <p className="mt-3 text-sm opacity-90">
            あなたの&quot;こだわり&quot;を引き出し、プロ品質のストーリーに。
            <br />
            発信が苦手でも大丈夫。1時間の対話だけで、お店の魅力が伝わります。
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link href="/for-shops">無料で始める</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
