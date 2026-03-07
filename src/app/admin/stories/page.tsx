"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Story, Shop } from "@/types/database";

type StoryWithShop = Story & {
  shop_name: string;
  shop_slug: string;
  empathy_count: number;
  quality_score: number;
  quality_flags: string[];
};

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<StoryWithShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStories() {
      try {
        const supabase = createClient();

        const { data: storiesData } = await supabase
          .from("stories")
          .select("*")
          .order("created_at", { ascending: false });

        if (!storiesData) {
          setIsLoading(false);
          return;
        }

        const shopIds = [
          ...new Set(
            (storiesData as Story[]).map((s) => s.shop_id)
          ),
        ];

        const { data: shopsData } = await supabase
          .from("shops")
          .select("id, name, slug")
          .in("id", shopIds);

        const shopMap = new Map(
          ((shopsData as Pick<Shop, "id" | "name" | "slug">[]) ?? []).map(
            (s) => [s.id, s]
          )
        );

        // 共感タップ数
        const storyIds = (storiesData as Story[]).map((s) => s.id);
        const { data: empathyData } = await supabase
          .from("empathy_taps")
          .select("story_id")
          .in("story_id", storyIds);

        const empathyCounts = new Map<string, number>();
        for (const row of (empathyData as { story_id: string }[]) ?? []) {
          empathyCounts.set(
            row.story_id,
            (empathyCounts.get(row.story_id) ?? 0) + 1
          );
        }

        const enriched: StoryWithShop[] = (storiesData as Story[]).map(
          (story) => {
            const shop = shopMap.get(story.shop_id);
            // 品質スコア自動算出
            const flags: string[] = [];
            let score = 0;
            const bodyLen = story.body?.length ?? 0;
            if (bodyLen >= 400) score += 30; else if (bodyLen >= 200) score += 15; else flags.push("本文が短い");
            if (story.summary && story.summary.length >= 20) score += 15; else flags.push("要約なし");
            if (story.title && story.title.length >= 5) score += 10;
            const keyQuotes = (story as Record<string, unknown>).key_quotes as string[] | undefined;
            if (keyQuotes && keyQuotes.length >= 1) score += 15; else flags.push("引用なし");
            const emotionTags = (story as Record<string, unknown>).emotion_tags as string[] | undefined;
            if (emotionTags && emotionTags.length >= 2) score += 15; else flags.push("タグ不足");
            const themes = (story as Record<string, unknown>).story_themes as Record<string, number> | undefined;
            if (themes && Object.values(themes).some(v => v >= 3)) score += 15; else flags.push("テーマ弱");
            return {
              ...story,
              shop_name: shop?.name ?? "不明",
              shop_slug: shop?.slug ?? "",
              empathy_count: empathyCounts.get(story.id) ?? 0,
              quality_score: Math.min(score, 100),
              quality_flags: flags,
            };
          }
        );

        setStories(enriched);
      } catch {
        // Ignore
      }
      setIsLoading(false);
    }
    loadStories();
  }, []);

  function getStatusBadge(status: string) {
    switch (status) {
      case "published":
        return <Badge className="text-xs">公開中</Badge>;
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs">
            下書き
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ストーリー管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全ストーリーの一覧と状態管理
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {stories.length}件
        </Badge>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {stories.map((story) => (
            <Card key={story.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold leading-snug">
                      {story.title}
                    </h3>
                    {getStatusBadge(story.status)}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {story.shop_name}
                  </p>
                  {story.summary && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {story.summary}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>共感 {story.empathy_count}回</span>
                    <span>
                      作成:{" "}
                      {new Date(story.created_at).toLocaleDateString("ja-JP")}
                    </span>
                    <span className={`font-medium ${
                      story.quality_score >= 70 ? "text-green-600" :
                      story.quality_score >= 40 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      品質 {story.quality_score}点
                    </span>
                  </div>
                  {story.quality_flags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {story.quality_flags.map((flag) => (
                        <Badge key={flag} variant="outline" className="text-[10px] text-orange-600 border-orange-200">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="icon" asChild className="shrink-0">
                  <Link href={`/shops/${story.shop_slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
