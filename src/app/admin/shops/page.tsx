"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, Heart, BookOpen, Loader2, ExternalLink, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Shop } from "@/types/database";

type AdminShop = Shop & {
  story_count: number;
  oshi_count: number;
  stories: { id: string; title: string; status: string }[];
};

/** 店舗ヘルススコア算出 (0-100) */
function calcHealthScore(shop: AdminShop): { score: number; label: string; color: string } {
  let score = 0;
  // 公開状態 (20pt)
  if (shop.is_published) score += 20;
  // ストーリーあり (25pt)
  const publishedStories = shop.stories.filter(s => s.status === "published").length;
  if (publishedStories >= 1) score += 25;
  // 応援者数 (25pt: 5人以上で満点)
  score += Math.min(25, Math.floor((shop.oshi_count / 5) * 25));
  // ストーリー数 (15pt: 2件以上で満点)
  score += Math.min(15, Math.floor((shop.story_count / 2) * 15));
  // プロフィール完成度 (15pt)
  if (shop.name) score += 5;
  if (shop.area) score += 5;
  if (shop.category) score += 5;

  score = Math.min(score, 100);
  const label = score >= 80 ? "良好" : score >= 50 ? "改善余地" : "要対応";
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return { score, label, color };
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店舗管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            登録店舗の一覧と公開状態の管理
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {shops.length}店舗
        </Badge>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {shops.map((shop) => (
            <Card key={shop.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* 店舗情報 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
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
                </div>

                {/* アクション */}
                <div className="flex items-center gap-2 shrink-0">
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
                    {shop.is_published ? "非公開にする" : "公開する"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
