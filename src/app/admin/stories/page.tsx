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
            return {
              ...story,
              shop_name: shop?.name ?? "不明",
              shop_slug: shop?.slug ?? "",
              empathy_count: empathyCounts.get(story.id) ?? 0,
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
                  </div>
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
