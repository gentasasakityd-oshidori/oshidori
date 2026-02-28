"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, Heart, MessageCircle, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AREAS, CATEGORIES } from "@/lib/constants";
import { DUMMY_SHOPS } from "@/lib/dummy-data";
import type { ShopWithRelations, Shop, Story, Menu } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [shops, setShops] = useState<ShopWithRelations[]>(DUMMY_SHOPS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Supabaseからデータを取得
  useEffect(() => {
    async function fetchShops() {
      try {
        const supabase = createClient();
        const { data: shopData, error } = await supabase
          .from("shops")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (error || !shopData || shopData.length === 0) {
          setIsLoaded(true);
          return;
        }

        // 各店舗にストーリー・メニュー・カウントを付与
        const enriched: ShopWithRelations[] = [];
        const typedShops = shopData as Shop[];
        for (const s of typedShops) {
          const [storiesRes, menusRes, oshiRes] = await Promise.all([
            supabase
              .from("stories")
              .select("*")
              .eq("shop_id", s.id)
              .eq("status", "published"),
            supabase.from("menus").select("*").eq("shop_id", s.id),
            supabase
              .from("oshi_shops")
              .select("id", { count: "exact", head: true })
              .eq("shop_id", s.id),
          ]);

          const storyIds = (storiesRes.data as Story[] | null)?.map((st) => st.id) ?? [];
          let empathyCount = 0;
          if (storyIds.length > 0) {
            const empathyRes = await supabase
              .from("empathy_taps")
              .select("id", { count: "exact", head: true })
              .in("story_id", storyIds);
            empathyCount = empathyRes.count ?? 0;
          }

          enriched.push({
            ...s,
            stories: (storiesRes.data as Story[]) ?? [],
            menus: (menusRes.data as Menu[]) ?? [],
            _count: {
              oshi: oshiRes.count ?? 0,
              empathy: empathyCount,
            },
          });
        }

        setShops(enriched);
      } catch {
        // フォールバック: ダミーデータ
      }
      setIsLoaded(true);
    }
    fetchShops();
  }, []);

  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const matchesQuery =
        !query ||
        shop.name.includes(query) ||
        shop.owner_name.includes(query) ||
        shop.area.includes(query) ||
        shop.category.includes(query) ||
        shop.stories.some(
          (s) => s.title.includes(query) || s.body.includes(query)
        );
      const matchesArea = !selectedArea || shop.area === selectedArea;
      const matchesCategory =
        !selectedCategory || shop.category === selectedCategory;
      return matchesQuery && matchesArea && matchesCategory;
    });
  }, [query, selectedArea, selectedCategory, shops]);

  const activeFilterCount =
    (selectedArea ? 1 : 0) + (selectedCategory ? 1 : 0);

  function clearFilters() {
    setSelectedArea(null);
    setSelectedCategory(null);
    setQuery("");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* 検索バー */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="店名、エリア、ジャンルで検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetTitle>絞り込み</SheetTitle>
            <div className="mt-6 space-y-6">
              {/* エリア */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">エリア</h3>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map((area) => (
                    <button
                      key={area}
                      onClick={() =>
                        setSelectedArea(selectedArea === area ? null : area)
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selectedArea === area
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
              {/* カテゴリ */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">ジャンル</h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === cat ? null : cat
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selectedCategory === cat
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
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
      </div>

      {/* アクティブフィルター表示 */}
      {(selectedArea || selectedCategory) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">絞り込み:</span>
          {selectedArea && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => setSelectedArea(null)}
            >
              {selectedArea}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {selectedCategory && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => setSelectedCategory(null)}
            >
              {selectedCategory}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}

      {/* エリアクイックフィルター（モバイル横スクロール） */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 md:hidden">
        {AREAS.map((area) => (
          <button
            key={area}
            onClick={() =>
              setSelectedArea(selectedArea === area ? null : area)
            }
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
              selectedArea === area
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            {area}
          </button>
        ))}
      </div>

      {/* 結果件数 */}
      <p className="mt-4 text-sm text-muted-foreground">
        {filteredShops.length}件のお店が見つかりました
      </p>

      {/* 店舗一覧 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredShops.map((shop) => {
          const mainStory = shop.stories[0];
          return (
            <Card
              key={shop.id}
              className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="h-36 bg-gradient-to-br from-warm to-secondary" />
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {shop.area}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {shop.category}
                  </Badge>
                </div>
                <h3 className="mt-2 font-semibold leading-snug">
                  <Link
                    href={`/shops/${shop.slug}`}
                    className="hover:text-primary"
                  >
                    {shop.name}
                  </Link>
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {shop.owner_name}
                </p>
                {mainStory && (
                  <>
                    <p className="mt-2 text-sm font-medium text-primary">
                      {mainStory.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {mainStory.summary}
                    </p>
                  </>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {shop._count.oshi} 推し
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {shop._count.empathy} 共感
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 結果なし */}
      {filteredShops.length === 0 && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold">
            条件に合うお店が見つかりませんでした
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            フィルターを調整するか、別のキーワードで検索してみてください
          </p>
          <Button variant="outline" onClick={clearFilters} className="mt-4">
            フィルターをクリア
          </Button>
        </div>
      )}
    </div>
  );
}
