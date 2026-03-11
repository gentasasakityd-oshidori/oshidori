"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, Heart, BookOpen, Loader2, ExternalLink, Activity, RefreshCw, AlertTriangle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PHASE_METADATA, type OnboardingPhase } from "@/lib/onboarding";
import type { Shop } from "@/types/database";

type AdminShop = Shop & {
  story_count: number;
  oshi_count: number;
  stories: { id: string; title: string; status: string }[];
};

/** 店舗ヘルススコア算出 (0-100) */
function calcHealthScore(shop: AdminShop): { score: number; label: string; color: string } {
  let score = 0;
  if (shop.is_published) score += 20;
  const publishedStories = shop.stories.filter(s => s.status === "published").length;
  if (publishedStories >= 1) score += 25;
  score += Math.min(25, Math.floor((shop.oshi_count / 5) * 25));
  score += Math.min(15, Math.floor((shop.story_count / 2) * 15));
  if (shop.name) score += 5;
  if (shop.area) score += 5;
  if (shop.category) score += 5;

  score = Math.min(score, 100);
  const label = score >= 80 ? "良好" : score >= 50 ? "改善余地" : "要対応";
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return { score, label, color };
}

type FilterTab = "all" | "onboarding" | "published" | "error";

export default function AdminShopsPage() {
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/shops");
      if (res.ok) {
        const data = await res.json();
        setShops(data.shops);
      }
    } catch {
      // Ignore
    }
    setIsLoading(false);
  }

  async function togglePublish(shopId: string, currentState: boolean) {
    setTogglingId(shopId);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: shopId,
          is_published: !currentState,
        }),
      });
      if (res.ok) {
        setShops((prev) =>
          prev.map((s) =>
            s.id === shopId ? { ...s, is_published: !currentState } : s
          )
        );
      }
    } catch {
      // Ignore
    }
    setTogglingId(null);
  }

  async function retryPipeline(shopId: string) {
    setRetryingId(shopId);
    try {
      await fetch(`/api/admin/onboarding/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_pipeline" }),
      });
      await loadShops();
    } catch {
      // Ignore
    }
    setRetryingId(null);
  }

  const getPhaseInfo = (phase: string) => {
    return PHASE_METADATA[phase as OnboardingPhase] ?? {
      label: phase,
      shortLabel: phase,
      color: "bg-gray-100",
      textColor: "text-gray-700",
    };
  };

  // フィルタリング
  const filteredShops = shops.filter((shop) => {
    const phase = (shop as AdminShop & { onboarding_phase?: string }).onboarding_phase;
    if (filter === "all") return true;
    if (filter === "published") return shop.is_published;
    if (filter === "error") return phase === "pipeline_error";
    if (filter === "onboarding") return !shop.is_published && phase !== "pipeline_error";
    return true;
  });

  const errorCount = shops.filter((s) => (s as AdminShop & { onboarding_phase?: string }).onboarding_phase === "pipeline_error").length;
  const onboardingCount = shops.filter((s) => !(s as AdminShop & { onboarding_phase?: string }).is_published && (s as AdminShop & { onboarding_phase?: string }).onboarding_phase !== "pipeline_error").length;
  const publishedCount = shops.filter((s) => s.is_published).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店舗管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            申請・オンボーディング・公開状態を一元管理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {shops.length}店舗
          </Badge>
          <Button variant="outline" size="sm" onClick={loadShops} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* フィルタータブ */}
      <div className="mt-4 flex gap-2 border-b">
        {([
          { key: "all" as FilterTab, label: "全件", count: shops.length },
          { key: "onboarding" as FilterTab, label: "オンボーディング中", count: onboardingCount },
          { key: "published" as FilterTab, label: "公開中", count: publishedCount },
          { key: "error" as FilterTab, label: "エラー", count: errorCount },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredShops.map((shop) => {
            const phase = (shop as AdminShop & { onboarding_phase?: string }).onboarding_phase || "application_pending";
            const phaseInfo = getPhaseInfo(phase);
            const isError = phase === "pipeline_error";

            return (
              <Card key={shop.id} className={isError ? "border-red-300" : ""}>
                <CardContent className="flex items-center gap-4 p-4">
                  {/* 店舗情報 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/shops/${shop.id}`}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {shop.name}
                      </Link>
                      <Badge
                        variant={shop.is_published ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {shop.is_published ? "公開中" : "非公開"}
                      </Badge>
                      {/* オンボーディングフェーズバッジ */}
                      <Badge
                        variant="outline"
                        className={`text-xs border-0 ${phaseInfo.color} ${phaseInfo.textColor}`}
                      >
                        {phaseInfo.shortLabel}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {shop.owner_name} / {shop.area} / {shop.category}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        ストーリー {shop.story_count}件
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        ファン {shop.oshi_count}
                      </span>
                      {(() => {
                        const health = calcHealthScore(shop);
                        return (
                          <span className={`flex items-center gap-1 font-medium ${health.color}`}>
                            <Activity className="h-3 w-3" />
                            {health.label} {health.score}点
                          </span>
                        );
                      })()}
                    </div>
                    {/* エラー表示 */}
                    {isError && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        パイプラインエラーが発生しています
                      </div>
                    )}
                  </div>

                  {/* アクション */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isError && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => retryPipeline(shop.id)}
                        disabled={retryingId === shop.id}
                      >
                        {retryingId === shop.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        再実行
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/shops/${shop.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => togglePublish(shop.id, shop.is_published)}
                      disabled={togglingId === shop.id}
                    >
                      {togglingId === shop.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : shop.is_published ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      {shop.is_published ? "非公開" : "公開"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredShops.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              該当する店舗はありません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
