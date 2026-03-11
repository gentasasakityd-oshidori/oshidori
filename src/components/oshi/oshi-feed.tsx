"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, RefreshCw, Newspaper, Zap, Mail, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EngagementStreak } from "./engagement-streak";
import { DailyRecommendation } from "./daily-recommendation";

type FeedItem = {
  id: string;
  type: "update" | "flash" | "message";
  shop_name: string;
  shop_slug: string;
  shop_image: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
  extra?: Record<string, unknown>;
};

type StreakData = { current: number; longest: number };
type RecommendationData = {
  id: string;
  reason: string;
  shop: { name: string; slug: string; image_url: string; area: string; category: string };
};

const TYPE_CONFIG = {
  update: { icon: Newspaper, label: "近況", color: "bg-blue-50 text-blue-700" },
  flash: { icon: Zap, label: "速報", color: "bg-orange-50 text-orange-700" },
  message: { icon: Mail, label: "お知らせ", color: "bg-green-50 text-green-700" },
} as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export function OshiFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch("/api/oshi/feed");
      if (res.ok) {
        const data = await res.json();
        setFeed(data.feed || []);
        setStreak(data.streak || null);
        setRecommendations(data.recommendations || []);
      }
    } catch {
      // ignore
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ストリーク + リフレッシュ */}
      <div className="flex items-center justify-between">
        {streak && <EngagementStreak current={streak.current} longest={streak.longest} />}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadFeed(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 日替わりレコメンド */}
      {recommendations.length > 0 && (
        <DailyRecommendation recommendations={recommendations} />
      )}

      {/* フィード */}
      {feed.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Newspaper className="mx-auto mb-2 h-8 w-8" />
            <p>推し店の新着情報はまだありません</p>
            <p className="mt-1 text-sm">推し店を追加すると、ここに最新情報が表示されます</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;

            return (
              <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* ヘッダー */}
                  <div className="flex items-center gap-3 px-4 pt-3">
                    <Link href={`/shops/${item.shop_slug}`} className="shrink-0">
                      {item.shop_image ? (
                        <Image
                          src={item.shop_image}
                          alt={item.shop_name}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {item.shop_name[0]}
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/shops/${item.shop_slug}`}
                        className="text-sm font-semibold hover:text-primary"
                      >
                        {item.shop_name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                          <Icon className="mr-0.5 h-2.5 w-2.5" />
                          {config.label}
                        </Badge>
                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* コンテンツ */}
                  <div className="px-4 py-2">
                    <p className="text-sm whitespace-pre-line line-clamp-4">{item.content}</p>
                    {item.type === "flash" && typeof item.extra?.available_until === "string" ? (
                      <p className="mt-1 text-xs text-orange-600">
                        提供期限: {new Date(item.extra.available_until).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    ) : null}
                  </div>

                  {/* 画像 */}
                  {item.image_url && (
                    <div className="px-4 pb-3">
                      <Image
                        src={item.image_url}
                        alt=""
                        width={400}
                        height={300}
                        className="w-full rounded-lg object-cover"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
