"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Search, SlidersHorizontal, X, Loader2, List, MapPin, ChevronDown, Settings } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { CATEGORIES, STATION_BY_LINE, MOOD_TAGS } from "@/lib/constants";
import { THEME_TO_DISPLAY_TAG } from "@/lib/display-tags";
import type { MoodTagValue } from "@/lib/constants";

// 予算帯の選択肢（金額ステップ）
const BUDGET_PRICE_STEPS = [
  { value: 0, label: "指定なし" },
  { value: 500, label: "500円" },
  { value: 1000, label: "1,000円" },
  { value: 2000, label: "2,000円" },
  { value: 3000, label: "3,000円" },
  { value: 5000, label: "5,000円" },
  { value: 7000, label: "7,000円" },
  { value: 10000, label: "10,000円" },
  { value: 15000, label: "15,000円" },
  { value: 20000, label: "20,000円" },
] as const;
import { HorizontalCard } from "@/components/shop-cards/horizontal-card";

import type { ShopWithRelations } from "@/types/database";
import { trackFilterUse } from "@/lib/posthog";

const MapView = dynamic(() => import("@/components/map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-[#E06A4E]" />
    </div>
  ),
});

// こだわりフィルター定義
const KODAWARI_FILTERS = [
  { icon: "🔥", label: "職人魂", themeKey: "food_craft" },
  { icon: "🌿", label: "食材愛", themeKey: "origin" },
  { icon: "😊", label: "人柄", themeKey: "personality" },
  { icon: "🤝", label: "コミュニティ", themeKey: "community" },
  { icon: "💝", label: "おもてなし", themeKey: "hospitality" },
  { icon: "📍", label: "街とのつながり", themeKey: "local_connection" },
  { icon: "🌟", label: "未来への想い", themeKey: "vision" },
] as const;

type SortMode = "forecast" | "newest" | "distance";

/** shop -> display_tags（structured_tags優先） */
function getDisplayTags(shop: ShopWithRelations): Array<{ icon: string; label: string }> {
  // 1. structured_tags（ShopStructuredTag[]）からの固有タグ
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
    if (result.length === 1 && shop.display_tags && shop.display_tags.length > 0) {
      result.push({ icon: shop.display_tags[0].icon, label: shop.display_tags[0].label });
      return result;
    }
    if (result.length > 0) return result;
  }

  // 2. DB display_tags
  if (shop.display_tags && shop.display_tags.length > 0) {
    return shop.display_tags.slice(0, 2).map((t) => ({ icon: t.icon, label: t.label }));
  }

  // 3. fallback: story_themes
  if (!story?.story_themes) return [];
  const themes = story.story_themes as Record<string, number>;
  return Object.entries(themes)
    .filter(([key]) => key in THEME_TO_DISPLAY_TAG)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key]) => THEME_TO_DISPLAY_TAG[key]);
}

/** 予報スコア計算 */
function computeForecastScore(shop: ShopWithRelations, selectedThemes: Set<string>): number {
  const story = shop.stories[0];
  if (!story?.story_themes) return 0;
  const themes = story.story_themes as Record<string, number>;
  if (selectedThemes.size > 0) {
    let total = 0;
    let count = 0;
    for (const key of selectedThemes) {
      const score = themes[key];
      if (typeof score === "number") {
        total += score;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }
  // テーマ未選択時: 最大スコア
  let max = 0;
  for (const score of Object.values(themes)) {
    if (typeof score === "number" && score > max) max = score;
  }
  return max;
}

/** 予報理由テキスト */
function getForecastReason(shop: ShopWithRelations, selectedThemes: Set<string>): string | null {
  const story = shop.stories[0];
  if (!story?.story_themes) return null;
  const themes = story.story_themes as Record<string, number>;

  if (selectedThemes.size > 0) {
    // 選択テーマの中で最もスコアが高いもの
    let topKey: string | null = null;
    let topScore = 0;
    for (const key of selectedThemes) {
      const score = themes[key];
      if (typeof score === "number" && score > topScore) {
        topScore = score;
        topKey = key;
      }
    }
    if (topKey && topKey in THEME_TO_DISPLAY_TAG) {
      return `${THEME_TO_DISPLAY_TAG[topKey].label}のお店`;
    }
  } else {
    // 全テーマの最高スコア
    let topKey: string | null = null;
    let topScore = 0;
    for (const [key, score] of Object.entries(themes)) {
      if (typeof score === "number" && score > topScore) {
        topScore = score;
        topKey = key;
      }
    }
    if (topKey && topKey in THEME_TO_DISPLAY_TAG) {
      return `${THEME_TO_DISPLAY_TAG[topKey].label}のお店`;
    }
  }
  return null;
}

/** Haversine距離 (km) */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Set toggle helper */
function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

/** 「この店も載せてほしい」リクエストセクション */
function ShopRequestSection() {
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [area, setArea] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim() || !area.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/shop-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_name: shopName, area, reason }),
      });
      if (res.ok) {
        setSent(true);
        setShopName("");
        setArea("");
        setReason("");
      }
    } catch {
      // ignore
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-xl border border-green-200 bg-green-50/50 p-4 text-center text-sm text-green-700">
        リクエストを受け付けました！ご協力ありがとうございます。
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-dashed border-primary/30 bg-warm/30 p-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <span className="text-lg">🙋</span>
          推し店がまだ載っていない？リクエストする
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-medium text-[#2C3E50]">
            載せてほしいお店を教えてください
          </p>
          <Input
            placeholder="お店の名前"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
          />
          <Input
            placeholder="エリア（例: 渋谷、下北沢）"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          />
          <Input
            placeholder="おすすめの理由（任意）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={sending} className="flex-1">
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : "リクエストを送る"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              閉じる
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse initial values from URL (comma-separated for multi-select)
  const parseSet = (key: string): Set<string> => {
    const val = searchParams.get(key);
    if (!val) return new Set();
    return new Set(val.split(",").filter(Boolean));
  };

  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(() => parseSet("station"));
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [budgetMin, setBudgetMin] = useState<number>(0);
  const [budgetMax, setBudgetMax] = useState<number>(0); // 0 = 指定なし（上限なし）
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(() => parseSet("theme"));
  const [selectedMoodTags, setSelectedMoodTags] = useState<Set<MoodTagValue>>(() => parseSet("mood") as Set<MoodTagValue>);
  const [sortMode, setSortMode] = useState<SortMode>("forecast");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [stationQuery, setStationQuery] = useState("");
  const geo = useGeolocation();
  const geoLoading = geo.loading;
  const [viewMode, setViewMode] = useState<"list" | "map">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("explore_viewMode");
      if (saved === "map" || saved === "list") return saved;
    }
    return "list";
  });
  const [shops, setShops] = useState<ShopWithRelations[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Geolocation — useGeolocation フックを利用
  const userLocation = geo.location;
  const geoError = geo.error;

  // viewModeをsessionStorageに保存
  useEffect(() => {
    sessionStorage.setItem("explore_viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    setSelectedStations(parseSet("station"));
    setSelectedThemes(parseSet("theme"));
    setSelectedMoodTags(parseSet("mood") as Set<MoodTagValue>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    async function fetchShops() {
      try {
        const res = await fetch("/api/shops");
        if (!res.ok) throw new Error("Failed to fetch shops");
        const data = await res.json();
        setShops((data.shops as ShopWithRelations[]) ?? []);
      } catch {
        // fallback
      }
      setIsLoaded(true);
    }
    fetchShops();
  }, []);

  // 位置情報取得関数（useGeolocation フック経由）
  const requestGeolocation = useCallback(() => {
    if (userLocation) {
      setSortMode("distance");
      return;
    }
    geo.requestLocation();
  }, [userLocation, geo]);

  // フックから位置情報が取得されたらdistanceソートに切り替え
  useEffect(() => {
    if (geo.location && sortMode !== "distance") {
      setSortMode("distance");
    }
  }, [geo.location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request geolocation when distance sort is selected
  useEffect(() => {
    if (sortMode !== "distance" || userLocation) return;
    requestGeolocation();
  }, [sortMode, userLocation, requestGeolocation]);

  const filteredAndSortedShops = useMemo(() => {
    // 1. Filter
    const filtered = shops.filter((shop) => {
      const matchesQuery =
        !query ||
        shop.name.includes(query) ||
        shop.owner_name.includes(query) ||
        shop.area.includes(query) ||
        shop.category.includes(query) ||
        shop.stories.some(
          (s) => s.title.includes(query) || s.body.includes(query)
        );

      // OR within stations (match against area or nearest_station)
      const matchesStation = selectedStations.size === 0 ||
        selectedStations.has(shop.area) ||
        (shop.basic_info?.nearest_station && selectedStations.has(shop.basic_info.nearest_station));

      // OR within categories
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(shop.category);

      // OR within themes (score >= 3 for any selected theme)
      let matchesTheme = true;
      if (selectedThemes.size > 0) {
        const story = shop.stories[0];
        if (story?.story_themes) {
          const themes = story.story_themes as Record<string, number>;
          matchesTheme = Array.from(selectedThemes).some((key) => {
            const score = themes[key];
            return typeof score === "number" && score >= 3;
          });
        } else {
          matchesTheme = false;
        }
      }

      // 予算帯フィルター（下限・上限）
      let matchesBudget = true;
      if (budgetMin > 0 || budgetMax > 0) {
        const prices = shop.menus
          .map((m) => m.price)
          .filter((p): p is number => typeof p === "number" && p > 0);
        if (prices.length > 0) {
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          if (budgetMin > 0 && avgPrice < budgetMin) matchesBudget = false;
          if (budgetMax > 0 && avgPrice > budgetMax) matchesBudget = false;
        }
      }

      // OR within mood tags (score >= 0.7 for any selected mood)
      let matchesMoodTag = true;
      if (selectedMoodTags.size > 0) {
        if (shop.mood_scores && Array.isArray(shop.mood_scores) && shop.mood_scores.length > 0) {
          matchesMoodTag = Array.from(selectedMoodTags).some((moodTag) => {
            const moodScore = shop.mood_scores?.find((ms: { mood_tag: string; score: number }) => ms.mood_tag === moodTag);
            return moodScore && typeof moodScore.score === "number" && moodScore.score >= 0.7;
          });
        } else {
          matchesMoodTag = false;
        }
      }

      return matchesQuery && matchesStation && matchesCategory && matchesBudget && matchesTheme && matchesMoodTag;
    });

    // 2. Sort
    const sorted = [...filtered];
    if (sortMode === "forecast") {
      sorted.sort((a, b) => computeForecastScore(b, selectedThemes) - computeForecastScore(a, selectedThemes));
    } else if (sortMode === "newest") {
      sorted.sort((a, b) => {
        const dateA = a.stories[0]?.published_at ?? a.stories[0]?.created_at ?? a.created_at;
        const dateB = b.stories[0]?.published_at ?? b.stories[0]?.created_at ?? b.created_at;
        return dateB.localeCompare(dateA);
      });
    } else if (sortMode === "distance" && userLocation) {
      sorted.sort((a, b) => {
        const distA = a.basic_info?.latitude != null && a.basic_info?.longitude != null
          ? haversineDistance(userLocation.lat, userLocation.lng, a.basic_info.latitude, a.basic_info.longitude)
          : Infinity;
        const distB = b.basic_info?.latitude != null && b.basic_info?.longitude != null
          ? haversineDistance(userLocation.lat, userLocation.lng, b.basic_info.latitude, b.basic_info.longitude)
          : Infinity;
        return distA - distB;
      });
    }

    return sorted;
  }, [query, selectedStations, selectedCategories, budgetMin, budgetMax, selectedThemes, selectedMoodTags, shops, sortMode, userLocation]);

  // 店舗データから駅名リストを生成
  const stationList = useMemo(() => {
    const stationSet = new Set<string>();
    for (const shop of shops) {
      if (shop.basic_info?.nearest_station) stationSet.add(shop.basic_info.nearest_station);
      if (shop.area) stationSet.add(shop.area);
    }
    return Array.from(stationSet).sort();
  }, [shops]);

  // 路線リスト
  const lineNames = useMemo(() => Object.keys(STATION_BY_LINE), []);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const lineStations = selectedLine ? STATION_BY_LINE[selectedLine] ?? [] : [];

  // 全駅名リスト（重複なし、テキスト検索用）
  const allStationNames = useMemo(() => {
    const set = new Set<string>();
    for (const stations of Object.values(STATION_BY_LINE)) {
      for (const st of stations) set.add(st);
    }
    return Array.from(set).sort();
  }, []);

  // テキスト入力による駅候補フィルタ
  const stationSuggestions = useMemo(() => {
    if (!stationQuery.trim()) return [];
    const q = stationQuery.trim();
    return allStationNames.filter((st) => st.includes(q)).slice(0, 10);
  }, [stationQuery, allStationNames]);

  const hasBudgetFilter = budgetMin > 0 || budgetMax > 0;
  const activeFilterCount =
    selectedStations.size + selectedCategories.size + (hasBudgetFilter ? 1 : 0) + selectedThemes.size + selectedMoodTags.size;

  const updateURL = useCallback((params: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const current: Record<string, string | null> = {
      q: query || null,
      station: selectedStations.size > 0 ? Array.from(selectedStations).join(",") : null,
      theme: selectedThemes.size > 0 ? Array.from(selectedThemes).join(",") : null,
      mood: selectedMoodTags.size > 0 ? Array.from(selectedMoodTags).join(",") : null,
      ...params,
    };
    for (const [k, v] of Object.entries(current)) {
      if (v) sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(`/explore${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [query, selectedStations, selectedThemes, selectedMoodTags, router]);

  function clearFilters() {
    setSelectedStations(new Set());
    setSelectedCategories(new Set());
    setBudgetMin(0);
    setBudgetMax(0);
    setSelectedThemes(new Set());
    setSelectedMoodTags(new Set());
    setSelectedLine(null);
    setStationQuery("");
    setQuery("");
    router.replace("/explore", { scroll: false });
  }

  function handleStationToggle(station: string) {
    const next = toggleSet(selectedStations, station);
    setSelectedStations(next);
    const stationStr = next.size > 0 ? Array.from(next).join(",") : null;
    updateURL({ station: stationStr });
    if (next.has(station)) trackFilterUse({ filterType: "station", filterValue: station });
  }

  function handleThemeToggle(themeKey: string) {
    const next = toggleSet(selectedThemes, themeKey);
    setSelectedThemes(next);
    const themeStr = next.size > 0 ? Array.from(next).join(",") : null;
    updateURL({ theme: themeStr });
    if (next.has(themeKey)) trackFilterUse({ filterType: "theme", filterValue: themeKey });
  }

  function handleCategoryToggle(cat: string) {
    const next = toggleSet(selectedCategories, cat);
    setSelectedCategories(next);
    if (next.has(cat)) trackFilterUse({ filterType: "category", filterValue: cat });
  }

  function handleMoodTagToggle(moodTag: MoodTagValue) {
    const next = toggleSet(selectedMoodTags, moodTag);
    setSelectedMoodTags(next);
    const moodStr = next.size > 0 ? Array.from(next).join(",") : null;
    updateURL({ mood: moodStr });
    if (next.has(moodTag)) trackFilterUse({ filterType: "mood", filterValue: moodTag });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateURL({ q: query || null });
    if (query) trackFilterUse({ filterType: "keyword", filterValue: query });
  }

  const sortLabels: Record<SortMode, string> = {
    forecast: "おすすめ順",
    newest: "新着順",
    distance: "近い順",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {/* 検索ヘッダー */}
      <div className="mb-1">
        <h1 className="text-lg font-bold text-[#2C3E50]">お店をさがす</h1>
      </div>

      {/* Search bar — 丸角 + シャドウで目立たせる */}
      <form className="flex gap-2" onSubmit={handleSearchSubmit}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="店名・エリア・キーワードで探す..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-xl border-gray-200 bg-gray-50/80 pl-10 shadow-sm focus:bg-white focus:shadow-md transition-all"
          />
        </div>
        {/* List / Map toggle — 丸角 */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex h-10 w-10 items-center justify-center transition-colors ${
              viewMode === "list"
                ? "bg-[#E06A4E] text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
            title="リスト表示"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex h-10 w-10 items-center justify-center border-l transition-colors ${
              viewMode === "map"
                ? "bg-[#E06A4E] text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
            title="マップ表示"
          >
            <MapPin className="h-4 w-4" />
          </button>
        </div>
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="relative shrink-0 rounded-xl shadow-sm">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E06A4E] text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 flex flex-col">
            <SheetTitle>絞り込み</SheetTitle>
            <div className="mt-4 flex-1 overflow-y-auto space-y-6 pb-6 pr-1">
              {/* 駅（路線から選ぶ or テキスト入力） */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">駅</h3>
                {/* 路線で選ぶ */}
                <div className="mb-2">
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
                    value={selectedLine ?? ""}
                    onChange={(e) => setSelectedLine(e.target.value || null)}
                  >
                    <option value="">路線を選ぶ...</option>
                    {lineNames.map((line) => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>
                {selectedLine && lineStations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {lineStations.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStationToggle(st)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          selectedStations.has(st)
                            ? "border-[#E06A4E] bg-[#E06A4E] text-white"
                            : "border-gray-200 hover:border-[#E06A4E]"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                )}
                {/* 駅名テキスト検索 */}
                <div className="relative">
                  <Input
                    placeholder="駅名を入力して検索..."
                    value={stationQuery}
                    onChange={(e) => setStationQuery(e.target.value)}
                    className="text-xs h-8"
                  />
                  {stationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                      {stationSuggestions.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            handleStationToggle(st);
                            setStationQuery("");
                          }}
                          className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
                            selectedStations.has(st) ? "text-[#E06A4E] font-medium" : "text-gray-700"
                          }`}
                        >
                          {st} {selectedStations.has(st) ? "✓" : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* 選択中の駅 */}
                {selectedStations.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.from(selectedStations).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStationToggle(st)}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E06A4E] bg-[#E06A4E] text-white px-2.5 py-0.5 text-xs"
                      >
                        {st}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* ジャンル (multi-select) */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">ジャンル</h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selectedCategories.has(cat)
                          ? "border-[#E06A4E] bg-[#E06A4E] text-white"
                          : "border-gray-200 hover:border-[#E06A4E]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              {/* 予算帯（下限・上限選択） */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">予算帯</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-8 shrink-0">下限</label>
                    <select
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
                      value={budgetMin}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBudgetMin(val);
                        if (val > 0) trackFilterUse({ filterType: "budget", filterValue: `min_${val}` });
                      }}
                    >
                      {BUDGET_PRICE_STEPS.map((step) => (
                        <option key={`min-${step.value}`} value={step.value}>{step.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-8 shrink-0">上限</label>
                    <select
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
                      value={budgetMax}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBudgetMax(val);
                        if (val > 0) trackFilterUse({ filterType: "budget", filterValue: `max_${val}` });
                      }}
                    >
                      {BUDGET_PRICE_STEPS.map((step) => (
                        <option key={`max-${step.value}`} value={step.value}>{step.label}</option>
                      ))}
                    </select>
                  </div>
                  {budgetMin > 0 && budgetMax > 0 && budgetMin > budgetMax && (
                    <p className="text-[11px] text-red-500">下限が上限を超えています</p>
                  )}
                </div>
              </div>
              {/* 気分タグ (multi-select) */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">気分タグ</h3>
                <div className="grid grid-cols-2 gap-2">
                  {MOOD_TAGS.map((mood) => {
                    const isSelected = selectedMoodTags.has(mood.value);
                    return (
                      <button
                        key={mood.value}
                        type="button"
                        onClick={() => handleMoodTagToggle(mood.value)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? "border-[#E06A4E] bg-[#E06A4E]/5 text-[#E06A4E]"
                            : "border-gray-200 hover:border-[#E06A4E]"
                        }`}
                      >
                        <span className="text-base">{mood.icon}</span>
                        <span className="leading-tight">{mood.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* クリアボタン */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    clearFilters();
                    setIsFilterOpen(false);
                  }}
                >
                  フィルターをクリア
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </form>

      {/* こだわりフィルター pills (multi-select) with count badges */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {KODAWARI_FILTERS.map((pill) => {
          const count = shops.filter((s) => {
            const themes = s.stories[0]?.story_themes as Record<string, number> | undefined;
            return themes && typeof themes[pill.themeKey] === "number" && themes[pill.themeKey] >= 3;
          }).length;
          return (
            <button
              key={pill.themeKey}
              type="button"
              onClick={() => handleThemeToggle(pill.themeKey)}
              disabled={count === 0 && !selectedThemes.has(pill.themeKey)}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                selectedThemes.has(pill.themeKey)
                  ? "border-[#E06A4E] bg-[#E06A4E] text-white"
                  : count === 0
                    ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#E06A4E]/50"
              }`}
            >
              <span>{pill.icon}</span>
              <span>{pill.label}</span>
              {count > 0 && !selectedThemes.has(pill.themeKey) && (
                <span className="ml-0.5 text-[10px] text-gray-400">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 現在地から探すボタン */}
      {!userLocation && (
        <div className="mt-2">
          <button
            type="button"
            onClick={requestGeolocation}
            disabled={geoLoading}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs transition-colors disabled:opacity-60 ${
              geo.isDenied
                ? "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            {geoLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : geo.isDenied ? (
              <Settings className="h-3.5 w-3.5" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            <span>
              {geoLoading
                ? "位置情報を取得中..."
                : geo.isDenied
                  ? "位置情報の設定を確認する"
                  : "現在地から近い順で探す"}
            </span>
          </button>
          {!geoLoading && !geoError && !geo.isDenied && (
            <p className="mt-1 text-[10px] text-gray-400 ml-1">タップすると位置情報の許可を求めます</p>
          )}
        </div>
      )}
      {userLocation && sortMode === "distance" && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] text-green-600">
            <MapPin className="h-3 w-3" />
            現在地を使用中
          </span>
          <button
            type="button"
            onClick={() => {
              geo.clearLocation();
              setSortMode("forecast");
            }}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline"
          >
            解除
          </button>
        </div>
      )}

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-400">絞り込み:</span>
          {Array.from(selectedStations).map((st) => (
            <button key={`station-${st}`} type="button" onClick={() => handleStationToggle(st)}>
              <Badge variant="secondary" className="cursor-pointer gap-1 text-[11px]">
                {st}
                <X className="h-3 w-3" />
              </Badge>
            </button>
          ))}
          {Array.from(selectedCategories).map((cat) => (
            <button key={`cat-${cat}`} type="button" onClick={() => handleCategoryToggle(cat)}>
              <Badge variant="secondary" className="cursor-pointer gap-1 text-[11px]">
                {cat}
                <X className="h-3 w-3" />
              </Badge>
            </button>
          ))}
          {hasBudgetFilter && (
            <button type="button" onClick={() => { setBudgetMin(0); setBudgetMax(0); }}>
              <Badge variant="secondary" className="cursor-pointer gap-1 text-[11px]">
                予算: {budgetMin > 0 ? `${budgetMin.toLocaleString()}円` : "指定なし"}〜{budgetMax > 0 ? `${budgetMax.toLocaleString()}円` : "指定なし"}
                <X className="h-3 w-3" />
              </Badge>
            </button>
          )}
          {Array.from(selectedThemes).map((theme) => (
            <button key={`theme-${theme}`} type="button" onClick={() => handleThemeToggle(theme)}>
              <Badge variant="secondary" className="cursor-pointer gap-1 text-[11px]">
                {THEME_TO_DISPLAY_TAG[theme]?.label ?? theme}
                <X className="h-3 w-3" />
              </Badge>
            </button>
          ))}
          {Array.from(selectedMoodTags).map((moodTag) => {
            const mt = MOOD_TAGS.find((m) => m.value === moodTag);
            return (
              <button key={`mood-${moodTag}`} type="button" onClick={() => handleMoodTagToggle(moodTag)}>
                <Badge variant="secondary" className="cursor-pointer gap-1 text-[11px]">
                  {mt ? `${mt.icon} ${mt.label}` : moodTag}
                  <X className="h-3 w-3" />
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading — スケルトンUI */}
      {!isLoaded && (
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-[100px] w-[100px] shrink-0 rounded-xl bg-gray-200" />
              <div className="flex flex-1 flex-col justify-center gap-2 py-1">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/3 rounded bg-gray-100" />
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="flex gap-2">
                  <div className="h-3 w-12 rounded bg-gray-100" />
                  <div className="h-3 w-12 rounded bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result count + sort */}
      {isLoaded && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {filteredAndSortedShops.length}件のお店
          </p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#E06A4E] transition-colors"
            >
              {sortLabels[sortMode]}
              <ChevronDown className="h-3 w-3" />
            </button>
            {isSortOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-gray-200 bg-white shadow-lg py-1 min-w-[120px]">
                {(["forecast", "newest", "distance"] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setSortMode(mode);
                      setIsSortOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                      sortMode === mode ? "text-[#E06A4E] font-medium" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {sortLabels[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Geo fallback: station-based filter when geolocation denied */}
      {geoError && (
        <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <p className="text-xs font-medium text-orange-600 mb-1">{geoError}</p>

          {/* 拒否済み時: デバイス別の設定変更ガイド */}
          {geo.settingsGuide && (
            <div className="mb-2 rounded-md bg-white/70 p-2.5 border border-orange-100">
              <p className="text-[11px] leading-relaxed text-gray-700">
                <Settings className="inline h-3 w-3 mr-1 text-orange-500 -mt-0.5" />
                {geo.settingsGuide}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500 mb-1.5">代わりに駅で絞り込めます：</p>
          <div className="flex flex-wrap gap-1.5">
            {stationList.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  handleStationToggle(st);
                  setSortMode("forecast");
                }}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  selectedStations.has(st)
                    ? "border-[#E06A4E] bg-[#E06A4E] text-white"
                    : "border-gray-200 bg-white hover:border-[#E06A4E]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map View */}
      {isLoaded && viewMode === "map" && (() => {
        const mapShops = filteredAndSortedShops
          .filter((s) => s.basic_info?.latitude != null && s.basic_info?.longitude != null)
          .map((s) => ({
            slug: s.slug,
            name: s.name,
            area: s.area,
            category: s.category,
            latitude: s.basic_info!.latitude!,
            longitude: s.basic_info!.longitude!,
          }));
        const shopsWithoutGeo = filteredAndSortedShops.filter(
          (s) => s.basic_info?.latitude == null || s.basic_info?.longitude == null
        );
        return (
          <div className="mt-3">
            {mapShops.length > 0 ? (
              <MapView
                shops={mapShops}
                onShopClick={(slug) => router.push(`/shops/${slug}`)}
              />
            ) : (
              <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                <div className="text-center px-4">
                  <p className="text-sm text-gray-500 font-medium">
                    {filteredAndSortedShops.length === 0
                      ? "表示するお店がありません"
                      : "地図に表示できるお店がありません"}
                  </p>
                  {shopsWithoutGeo.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {shopsWithoutGeo.length}件のお店に位置情報がありません
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Shop list - HorizontalCard */}
      {isLoaded && viewMode === "list" && filteredAndSortedShops.length > 0 && (
        <div className="mt-2 divide-y divide-gray-100">
          {filteredAndSortedShops.map((shop) => {
            const mainStory = shop.stories[0];
            const forecastScore = computeForecastScore(shop, selectedThemes);
            const forecastReason = getForecastReason(shop, selectedThemes);
            const distKm =
              sortMode === "distance" && userLocation && shop.basic_info?.latitude != null && shop.basic_info?.longitude != null
                ? haversineDistance(userLocation.lat, userLocation.lng, shop.basic_info.latitude, shop.basic_info.longitude)
                : null;
            const walkingMin = distKm != null ? Math.round(distKm / 0.08) : null;
            return (
              <HorizontalCard
                key={shop.id}
                shopSlug={shop.slug}
                shopName={shop.name}
                area={shop.area}
                imageUrl={shop.image_url}
                hookSentence={
                  mainStory?.catchcopy_primary ??
                  mainStory?.hook_sentence ??
                  mainStory?.summary ??
                  null
                }
                displayTags={getDisplayTags(shop)}
                forecastScore={forecastScore > 0 ? forecastScore : null}
                forecastReasonText={forecastReason}
                walkingMinutes={walkingMin}
                budgetLabel={shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch ?? null}
              />
            );
          })}
        </div>
      )}

      {/* この店も載せてほしいリクエスト */}
      {isLoaded && viewMode === "list" && (
        <ShopRequestSection />
      )}

      {/* No results — 改善されたempty state */}
      {isLoaded && viewMode === "list" && filteredAndSortedShops.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50">
            <Search className="h-8 w-8 text-[#E06A4E]/50" />
          </div>
          <h3 className="text-base font-bold text-[#2C3E50]">
            条件に合うお店が見つかりませんでした
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            条件を変えて、もう一度探してみませんか？
          </p>
          {activeFilterCount > 0 && (
            <div className="mt-3 rounded-lg bg-orange-50/50 px-4 py-3 text-xs text-gray-500">
              {selectedStations.size > 0 && (
                <p>駅の条件を外すと見つかるかもしれません</p>
              )}
              {hasBudgetFilter && (
                <p className="mt-1">予算帯を広げてみましょう</p>
              )}
              {selectedThemes.size > 0 && (
                <p className="mt-1">テーマの条件を減らしてみましょう</p>
              )}
            </div>
          )}
          <Button
            variant="outline"
            onClick={clearFilters}
            className="mt-4 rounded-xl"
          >
            フィルターをリセット
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
