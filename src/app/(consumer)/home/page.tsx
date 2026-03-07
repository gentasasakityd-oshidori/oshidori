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
import { TrendingStoriesSection, type TrendingShopData } from "@/components/home/trending-stories-section";
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


/** テーマ別 相性理由テンプレート — 「あなたに合う理由」として表示 */
const COMPATIBILITY_REASON_TEMPLATES: Record<string, string> = {
  origin: "創業ストーリーに共感する方に",
  food_craft: "食材と技術へのこだわりに惹かれる方に",
  community: "街との結びつきを大切にする方に",
  hospitality: "心のこもったおもてなしを求める方に",
  personality: "店主の人柄に惹かれる方に",
  local_connection: "地元の味と文化を楽しみたい方に",
  vision: "新しい挑戦を応援したい方に",
};

/** テーマキーから相性理由テキストを取得 */
function getForecastReasonText(themeKey: string): string {
  return COMPATIBILITY_REASON_TEMPLATES[themeKey] ?? "こだわりのお店";
}

/** story_themesから上位テーマキーとスコアを取得（最大3つ）
 *  エンゲージメント（oshi / empathy）でスコアにボーナスを付与
 */
function getTopThemes(shop: ShopWithRelations): Array<{ key: string; score: number }> {
  const story = shop.stories[0];
  if (!story?.story_themes) return [];
  const themes = story.story_themes as Record<string, number>;

  const entries = Object.entries(themes)
    .filter(([, score]) => typeof score === "number" && score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (entries.length === 0) return [];

  // エンゲージメントボーナス: oshi + empathy でスコアを最大 +2 補正
  const oshiCount = shop._count?.oshi ?? 0;
  const empathyCount = shop._count?.empathy ?? 0;
  const engagementBonus = Math.min(2, (oshiCount * 0.3 + empathyCount * 0.1));

  return entries.map(([key, score]) => ({
    key,
    score: Math.round(Math.min(10, score + engagementBonus) * 10) / 10,
  }));
}

/** 後方互換: 最高スコアテーマのみ返す */
function getTopTheme(shop: ShopWithRelations): { key: string; score: number } | null {
  const themes = getTopThemes(shop);
  return themes[0] ?? null;
}

/** story_themesから相性マッチ理由タグを生成（カード/タグ形式表示用） */
function getForecastReasonTags(shop: ShopWithRelations): Array<{ icon: string; label: string }> {
  const themes = getTopThemes(shop);
  return themes
    .filter(({ key }) => key in THEME_TO_DISPLAY_TAG)
    .map(({ key }) => THEME_TO_DISPLAY_TAG[key]);
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

  // 新着ストーリー: publishedが新しい順で最大5件（マッチング度合いは使わない）
  const latestStories = [...shopsWithStories]
    .sort((a, b) => {
      const dateA = a.stories[0]?.published_at ?? a.stories[0]?.created_at ?? "";
      const dateB = b.stories[0]?.published_at ?? b.stories[0]?.created_at ?? "";
      return dateB.localeCompare(dateA);
    })
    .slice(0, 5);

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

  // 推し店の新着更新を取得（ログイン済みユーザーのみ）
  // TODO: getOshiShopsUpdates関数を実装する
  let oshiShopsUpdates: ShopWithRelations[] = [];

  // みんなが共感しているストーリー: エンゲージメントスコア順に上位10件を準備
  const trendingCandidates: TrendingShopData[] = shopsWithStories
    .map((shop) => ({
      slug: shop.slug,
      shopName: shop.name,
      area: shop.area,
      imageUrl: shop.image_url,
      catchcopy: shop.stories[0]?.catchcopy_primary ?? shop.stories[0]?.title ?? null,
      hookSentence: shop.stories[0]?.hook_sentence ?? shop.stories[0]?.summary ?? null,
      lat: (shop.basic_info as Record<string, unknown> | null)?.latitude as number | null ?? null,
      lng: (shop.basic_info as Record<string, unknown> | null)?.longitude as number | null ?? null,
      engagementScore: (shop._count?.oshi ?? 0) + (shop._count?.empathy ?? 0),
      displayTags: getDisplayTags(shop),
      budgetLabel: shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null,
    }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 10);

  // エリア別エンゲージメント集計 → 人気エリア順リスト
  const areaEngagement = new Map<string, number>();
  for (const shop of shopsWithStories) {
    const score = (shop._count?.oshi ?? 0) + (shop._count?.empathy ?? 0);
    areaEngagement.set(shop.area, (areaEngagement.get(shop.area) ?? 0) + score);
  }
  const trendingAreaRanking = Array.from(areaEngagement.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([area]) => area);

  return (
    <>
      {/* Section 1: ストーリードリブンヒーロー */}
      <section className="relative min-h-[75vh] overflow-hidden">
        {/* 検索バー（上部に固定） */}
        <div className="absolute inset-x-0 top-0 z-10 px-4 pt-4">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-xl bg-white/90 backdrop-blur-sm shadow-sm">
              <SearchBar />
            </div>
          </div>
        </div>

        {pickupShop ? (
          <Link href={`/shops/${pickupShop.slug}`} className="block h-full min-h-[75vh] relative group">
            {/* フルブリード写真 */}
            {pickupShop.image_url ? (
              <img
                src={pickupShop.image_url}
                alt={pickupShop.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-amber-500/60" />
            )}
            {/* ダークグラデーション */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

            {/* テキストコンテンツ */}
            <div className="absolute inset-x-0 bottom-0 px-4 pb-8 pt-20">
              <div className="mx-auto max-w-5xl">
                {/* 今日のおすすめラベル */}
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-white mb-3">
                  <Sparkles className="h-3 w-3" />
                  今日のおすすめ
                </span>
                {/* デスクトップでは2カラムレイアウト */}
                <div className="md:flex md:items-end md:justify-between md:gap-8">
                  <div className="flex-1">
                    {/* hook_sentence 引用 */}
                    {pickupShop.stories[0]?.hook_sentence && (
                      <p className="text-[15px] md:text-[18px] italic leading-relaxed text-white/90 line-clamp-3 max-w-lg font-heading">
                        &ldquo;{pickupShop.stories[0].hook_sentence}&rdquo;
                      </p>
                    )}
                    <p className="mt-2 text-[12px] text-white/60">{pickupShop.area}</p>
                    <h1 className="mt-1 text-[24px] font-bold leading-tight text-white md:text-[36px] font-heading">
                      {pickupShop.name}
                    </h1>
                    {pickupShop.stories[0]?.catchcopy_primary && (
                      <p className="mt-1.5 text-[14px] md:text-[16px] text-white/80 line-clamp-2 max-w-md">
                        {pickupShop.stories[0].catchcopy_primary}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center gap-3 md:flex-col md:items-end md:gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#2C3E50] shadow-lg transition-transform group-hover:scale-105">
                      <BookOpen className="h-4 w-4 text-primary" />
                      ストーリーを読む
                    </span>
                    <span className="text-[12px] text-white/60">
                      {pickupShop._count?.oshi ?? 0}人が推し登録
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          /* 店舗がない場合のフォールバック */
          <div className="flex min-h-[75vh] items-center justify-center bg-gradient-to-br from-[#FEF3EC] via-[#FFF8F4] to-[#FFF0E6] px-4">
            <div className="mx-auto max-w-5xl text-center">
              <h1 className="text-[22px] font-bold leading-tight md:text-[28px] font-heading">
                店主の<span className="text-primary">こだわり</span>と
                <span className="text-primary">ストーリー</span>で出会う
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-[#5D6D7E]">
                AIインタビューで引き出した店主の想いを読んで、共感でお店を選ぶ
              </p>
            </div>
          </div>
        )}

        {/* スクロール誘導 */}
        <div className="absolute inset-x-0 bottom-1 flex justify-center">
          <span className="animate-bounce text-[11px] text-white/50">他のお店も見る ↓</span>
        </div>
      </section>

      {/* Section 2: 気分で選ぶ（4択） */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-base font-bold text-[#2C3E50] text-center font-heading md:text-lg">
            あなたはどんなお店が好きですか？
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
            {[
              { label: "職人の技を味わう", icon: "🔥", bg: "from-slate-700 to-gray-900", textColor: "text-white", filter: "food_craft", filterType: "theme" },
              { label: "隠れた名店を発掘", icon: "🚪", bg: "from-emerald-500 to-teal-600", textColor: "text-white", filter: "local_connection", filterType: "theme" },
              { label: "ふらっと一杯", icon: "🍶", bg: "from-amber-400 to-orange-500", textColor: "text-white", filter: "casual", filterType: "budget" },
              { label: "特別な日のご褒美", icon: "✨", bg: "from-rose-400 to-pink-500", textColor: "text-white", filter: "special", filterType: "budget" },
            ].map((mood) => (
              <Link
                key={mood.filter}
                href={mood.filterType === "budget"
                  ? `/explore?budget=${mood.filter}`
                  : `/explore?theme=${mood.filter}`
                }
                className={`group flex flex-col items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br ${mood.bg} p-5 md:p-6 transition-all hover:shadow-lg hover:-translate-y-0.5`}
              >
                <span className="text-3xl md:text-4xl">{mood.icon}</span>
                <span className={`text-[13px] md:text-[14px] font-bold ${mood.textColor}`}>{mood.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: みんなが共感しているストーリー（位置情報対応） */}
      {trendingCandidates.length > 0 && (
        <TrendingStoriesSection
          shops={trendingCandidates}
          areaRanking={trendingAreaRanking}
        />
      )}

      {/* パーソナルレコメンド（ログイン済み＋気分タグ設定済みの場合） */}
      {isLoggedIn && personalRecommendations.length > 0 && (
        <section className="px-4 py-5">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-[#2C3E50] font-heading md:text-base">あなたにおすすめ</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              あなたの気分タグにマッチする店舗
            </p>
            {/* モバイル: 横スクロール / デスクトップ: グリッド */}
            <div className="relative md:hidden">
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none -mx-1 px-1 pr-8">
                {personalRecommendations.map((shop) => {
                  const topTheme = getTopTheme(shop);
                  const forecastScore = topTheme?.score ?? null;
                  const forecastReasonText = topTheme
                    ? getForecastReasonText(topTheme.key)
                    : null;
                  const reasonTags = getForecastReasonTags(shop);
                  return (
                    <div key={shop.id} className="snap-start shrink-0 w-[44vw] max-w-[200px] min-w-[170px]">
                      <SmallCard
                        shopSlug={shop.slug}
                        shopName={shop.name}
                        area={shop.area}
                        imageUrl={shop.image_url}
                        catchcopy={shop.stories[0]?.catchcopy_primary ?? shop.stories[0]?.title ?? null}
                        hookSentence={shop.stories[0]?.hook_sentence ?? null}
                        displayTags={getDisplayTags(shop)}
                        forecastScore={forecastScore}
                        forecastReasonText={forecastReasonText}
                        forecastReasonTags={reasonTags}
                        budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent" />
            </div>
            {/* デスクトップ: グリッド表示 */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {personalRecommendations.map((shop) => {
                const topTheme = getTopTheme(shop);
                const forecastScore = topTheme?.score ?? null;
                const forecastReasonText = topTheme
                  ? getForecastReasonText(topTheme.key)
                  : null;
                const reasonTags = getForecastReasonTags(shop);
                return (
                  <SmallCard
                    key={shop.id}
                    shopSlug={shop.slug}
                    shopName={shop.name}
                    area={shop.area}
                    imageUrl={shop.image_url}
                    catchcopy={shop.stories[0]?.catchcopy_primary ?? shop.stories[0]?.title ?? null}
                    hookSentence={shop.stories[0]?.hook_sentence ?? null}
                    displayTags={getDisplayTags(shop)}
                    forecastScore={forecastScore}
                    forecastReasonText={forecastReasonText}
                    forecastReasonTags={reasonTags}
                    budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 推し店の新着更新（ログイン済み＋推し店登録済みの場合） */}
      {isLoggedIn && oshiShopsUpdates.length > 0 && (
        <section className="px-4 py-5 bg-gradient-to-br from-orange-50/50 to-amber-50/30">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-[#2C3E50] font-heading">推し店の新着更新</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              あなたが推し登録したお店の最新情報
            </p>
            <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {oshiShopsUpdates.map((shop) => {
                const topTheme = getTopTheme(shop);
                const forecastScore = topTheme?.score ?? null;
                const forecastReasonText = topTheme
                  ? `${THEME_TO_DISPLAY_TAG[topTheme.key]?.label ?? "こだわり"}のお店`
                  : null;
                const reasonTags = getForecastReasonTags(shop);
                return (
                  <HorizontalCard
                    key={shop.id}
                    shopSlug={shop.slug}
                    shopName={shop.name}
                    area={shop.area}
                    imageUrl={shop.image_url}
                    hookSentence={shop.stories[0]?.hook_sentence ?? shop.stories[0]?.summary ?? null}
                    displayTags={getDisplayTags(shop)}
                    forecastScore={forecastScore}
                    forecastReasonText={forecastReasonText}
                    forecastReasonTags={reasonTags}
                    budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Section: オシドリ予報 */}
      <section id="forecast" className="px-4 py-6 scroll-mt-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-1.5 font-heading md:text-xl">
                ☀️ あなたとの相性予報
              </h2>
            </div>
            {shopsWithStories.length > 0 && (
              <Link
                href="/explore"
                className="text-sm text-primary hover:underline shrink-0"
              >
                すべて見る
              </Link>
            )}
          </div>

          {/* 推し店CTA: 目立つ誘導デザイン */}
          {isLoggedIn && collectionCount > 0 && (
            <Link
              href="/oshi"
              className="mt-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 px-4 py-3 transition-all hover:shadow-md hover:-translate-y-0.5 group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-orange-100 shrink-0">
                <Heart className="h-5 w-5 text-primary" fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#2C3E50]">
                  推し店 {collectionCount}店の共感データから予測中
                </p>
                <p className="text-[11px] text-[#5D6D7E] mt-0.5">
                  推し店を増やすほど、相性予報の精度がアップします
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <TrendingUp className="h-4 w-4 text-primary" />
                <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )}

          {shopsWithStories.length > 0 ? (
            <>
              {/* パーソナライズ済み / 未パーソナライズ で説明文を分岐 */}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  {hasEmpathyData
                    ? "あなたの好みに合いそうなお店をピックアップ"
                    : "ストーリーに共感するほど、相性予報の精度がアップ"}
                </p>
                <span className="text-[10px] text-primary/60 flex items-center gap-0.5 animate-pulse md:hidden">
                  スワイプ →
                </span>
              </div>

              {/* モバイル: 横スクロールカルーセル */}
              <div className="relative mt-3 md:hidden">
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none -mx-1 px-1 pr-8">
                  {shopsWithStories.map((shop) => {
                    const topTheme = getTopTheme(shop);
                    const forecastScore = topTheme?.score ?? null;
                    const forecastReasonText = topTheme
                      ? getForecastReasonText(topTheme.key)
                      : null;
                    const reasonTags = getForecastReasonTags(shop);
                    return (
                      <div key={shop.id} className="snap-start shrink-0 w-[44vw] max-w-[200px] min-w-[170px]">
                        <SmallCard
                          shopSlug={shop.slug}
                          shopName={shop.name}
                          area={shop.area}
                          imageUrl={shop.image_url}
                          catchcopy={shop.stories[0]?.catchcopy_primary ?? shop.stories[0]?.title ?? null}
                          hookSentence={shop.stories[0]?.hook_sentence ?? null}
                          displayTags={getDisplayTags(shop)}
                          forecastScore={forecastScore}
                          forecastReasonText={forecastReasonText}
                          forecastReasonTags={reasonTags}
                          budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* 右端フェードで「続きがある」ことを示す */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent" />
              </div>

              {/* デスクトップ: グリッドレイアウト */}
              <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
                {shopsWithStories.map((shop) => {
                  const topTheme = getTopTheme(shop);
                  const forecastScore = topTheme?.score ?? null;
                  const forecastReasonText = topTheme
                    ? getForecastReasonText(topTheme.key)
                    : null;
                  const reasonTags = getForecastReasonTags(shop);
                  return (
                    <SmallCard
                      key={shop.id}
                      shopSlug={shop.slug}
                      shopName={shop.name}
                      area={shop.area}
                      imageUrl={shop.image_url}
                      catchcopy={shop.stories[0]?.catchcopy_primary ?? shop.stories[0]?.title ?? null}
                      hookSentence={shop.stories[0]?.hook_sentence ?? null}
                      displayTags={getDisplayTags(shop)}
                      forecastScore={forecastScore}
                      forecastReasonText={forecastReasonText}
                      forecastReasonTags={reasonTags}
                      budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                    />
                  );
                })}
              </div>

              {/* 未ログイン or 共感データなし → パーソナライズ誘導 */}
              {(!isLoggedIn || !hasEmpathyData) && (
                <div className="mt-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 px-4 py-4 md:px-6 md:py-5">
                  <div className="flex items-center gap-3 md:gap-4">
                    <span className="text-2xl md:text-3xl">💫</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] md:text-[14px] font-bold text-[#2C3E50] font-heading">
                        あなただけの相性予報を作ろう
                      </p>
                      <p className="text-[11px] md:text-[12px] text-[#5D6D7E] mt-0.5">
                        ストーリーを読んで共感するほど、相性の合うお店が見つかります
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-orange-500 shrink-0">
                      <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-orange-200 text-[9px] md:text-[10px] font-bold">1</span>
                      読む
                      <span className="text-orange-300">→</span>
                      <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-orange-200 text-[9px] md:text-[10px] font-bold">2</span>
                      共感
                      <span className="text-orange-300">→</span>
                      <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-orange-200 text-[9px] md:text-[10px] font-bold">3</span>
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
              <p className="mt-2 text-[15px] font-bold text-[#2C3E50] font-heading">
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

      {/* Section: 近くの新着ストーリー（マッチング度合いなし、新着順） */}
      {latestStories.length > 0 && (
        <section className="bg-gray-50/50 px-4 py-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold font-heading md:text-xl">近くの新着ストーリー</h2>
              </div>
              <Link
                href="/explore?sort=newest"
                className="text-sm text-primary hover:underline"
              >
                すべて見る
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 mb-3">
              最近公開されたお店のストーリー
            </p>
            <div className="md:grid md:grid-cols-2 md:gap-4">
              {latestStories.map((shop) => (
                <HorizontalCard
                  key={shop.id}
                  shopSlug={shop.slug}
                  shopName={shop.name}
                  area={shop.area}
                  imageUrl={shop.image_url}
                  hookSentence={shop.stories[0]?.hook_sentence ?? shop.stories[0]?.summary ?? null}
                  displayTags={getDisplayTags(shop)}
                  budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* フィード枯渇対策: 店舗数が少ない場合のCTA */}
      {shopsWithStories.length <= 3 && (
        <section className="px-4 py-4">
          <div className="mx-auto max-w-5xl">
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

      {/* さがすタブへの誘導 */}
      <section className="px-4 py-5">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/explore"
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3.5 transition-colors hover:bg-gray-100/80"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-[#2C3E50]">
                エリア・駅・気分で検索するなら「さがす」タブへ
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
        </div>
      </section>

      {/* Section: オシドリとは */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-lg font-bold text-[#2C3E50] font-heading md:text-xl">
            オシドリとは？
          </h2>
          <p className="mt-1 text-center text-xs text-muted-foreground md:text-sm">
            飲食店と食べる人の新しい関係をつくるプラットフォーム
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-5 md:p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-orange-100">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold text-[#2C3E50] font-heading">店主の想いを物語に</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                AIインタビューで店主の言葉を引き出し、お店の魅力をストーリーに
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 md:p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-50 to-rose-100">
                <Heart className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="mt-3 font-semibold text-[#2C3E50] font-heading">共感で出会う</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                点数や口コミではなく、こだわりへの「共感」でお店を選ぶ新しい体験
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 md:p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-cyan-100">
                <MessageCircle className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="mt-3 font-semibold text-[#2C3E50] font-heading">推しでつながる</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                好きなお店を推し登録。あなたの「推し」がお店に届く
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: 飲食店オーナーCTA */}
      <section className="bg-primary px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-primary-foreground font-heading">飲食店オーナーの方へ</h2>
          <p className="mt-3 text-sm opacity-90 text-primary-foreground">
            あなたの&quot;こだわり&quot;を引き出し、プロ品質のストーリーに。
            <br />
            発信が苦手でも大丈夫。30分の対話だけで、お店の魅力が伝わります。
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link href="/for-shops">無料で始める</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
