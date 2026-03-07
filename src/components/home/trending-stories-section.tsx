"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { HorizontalCard } from "@/components/shop-cards/horizontal-card";
import { haversineDistance } from "@/lib/station-coordinates";

export interface TrendingShopData {
  slug: string;
  shopName: string;
  area: string;
  imageUrl: string | null;
  catchcopy: string | null;
  hookSentence: string | null;
  lat: number | null;
  lng: number | null;
  engagementScore: number;
  displayTags: Array<{ icon: string; label: string }>;
  budgetLabel: string | null;
}

interface TrendingStoriesSectionProps {
  shops: TrendingShopData[];
  areaRanking: string[];
}

export function TrendingStoriesSection({ shops, areaRanking }: TrendingStoriesSectionProps) {
  const [sortedShops, setSortedShops] = useState<TrendingShopData[]>([]);
  const [isNearby, setIsNearby] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shops.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // 位置情報を試行（タイムアウト5秒）
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          // 距離でソートして近い順に表示
          const withDistance = shops
            .filter((s) => s.lat != null && s.lng != null)
            .map((s) => ({
              ...s,
              distance: haversineDistance(userLat, userLng, s.lat!, s.lng!),
            }))
            .sort((a, b) => a.distance - b.distance);

          // 位置情報なしの店舗もfallbackに追加
          const noGeo = shops.filter((s) => s.lat == null || s.lng == null);
          const combined = [...withDistance, ...noGeo].slice(0, 3);

          setSortedShops(combined);
          setIsNearby(true);
          setLoading(false);
        },
        () => {
          // 位置情報拒否・エラー → エリアランキングで並べ替え
          if (cancelled) return;
          fallbackSort();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    } else {
      fallbackSort();
    }

    function fallbackSort() {
      // areaRanking 順でソート（人気エリア優先）
      const sorted = [...shops].sort((a, b) => {
        const aIdx = areaRanking.indexOf(a.area);
        const bIdx = areaRanking.indexOf(b.area);
        const aRank = aIdx >= 0 ? aIdx : 999;
        const bRank = bIdx >= 0 ? bIdx : 999;
        if (aRank !== bRank) return aRank - bRank;
        return b.engagementScore - a.engagementScore;
      });
      setSortedShops(sorted.slice(0, 3));
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [shops, areaRanking]);

  if (shops.length === 0) return null;

  return (
    <section className="px-4 py-6 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 mb-1">
          {isNearby && <MapPin className="h-4 w-4 text-primary" />}
          <h2 className="text-lg font-bold text-[#2C3E50] font-heading md:text-xl">
            {isNearby ? "あなたの近くで共感されているストーリー" : "みんなが共感しているストーリー"}
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          {isNearby ? "近くのお店の中から、共感の多いストーリーをピックアップ" : "多くの人が共感したストーリーを持つお店"}
        </p>

        {loading ? (
          // スケルトンローダー
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-stretch gap-3 py-3 animate-pulse">
                <div className="h-[100px] w-[100px] flex-shrink-0 rounded-xl bg-gray-200" />
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="md:grid md:grid-cols-2 md:gap-4">
            {sortedShops.map((shop) => (
              <HorizontalCard
                key={shop.slug}
                shopSlug={shop.slug}
                shopName={shop.shopName}
                area={shop.area}
                imageUrl={shop.imageUrl}
                hookSentence={shop.hookSentence}
                displayTags={shop.displayTags}
                budgetLabel={shop.budgetLabel}
              />
            ))}
            {sortedShops.length > 0 && (
              <div className="mt-2 flex justify-center">
                <span className="text-[11px] text-gray-400">
                  {sortedShops.reduce((sum, s) => sum + s.engagementScore, 0)}人が共感
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
