"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Settings,
  User,
  Clock,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EMPATHY_TAGS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Shop, Story } from "@/types/database";

type OshiShopWithRelations = Shop & {
  stories: Story[];
  _count: { empathy: number };
};

type EmpathyHistoryItem = {
  id: string;
  tag_type: string;
  story_title: string;
  shop_name: string;
  shop_slug: string;
  date: string;
};

function getEmpathyTag(tagId: string) {
  return EMPATHY_TAGS.find((t) => t.id === tagId);
}

export default function MyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [oshiShops, setOshiShops] = useState<OshiShopWithRelations[]>([]);
  const [empathyHistory, setEmpathyHistory] = useState<EmpathyHistoryItem[]>([]);
  const [oshiCount, setOshiCount] = useState(0);
  const [empathyCount, setEmpathyCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/mypage");
        return;
      }

      // Get nickname
      const { data: userData } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.id)
        .single();

      const typedUser = userData as { nickname: string } | null;
      setNickname(typedUser?.nickname ?? user.user_metadata?.nickname ?? "ユーザー");

      // Fetch oshi shops and empathy history from API
      try {
        const res = await fetch("/api/oshi/my");
        if (res.ok) {
          const data = await res.json();
          setOshiShops(data.shops ?? []);
          setEmpathyHistory(data.empathy_history ?? []);
          setOshiCount(data.oshi_count ?? 0);
          setEmpathyCount(data.empathy_count ?? 0);
        }
      } catch {
        // Ignore API errors
      }

      setIsLoading(false);
    }
    loadData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* プロフィールセクション */}
      <section className="bg-warm px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{nickname}</h1>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    推し店 {oshiCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    共感 {empathyCount}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="icon" asChild>
              <Link href="#" aria-label="設定">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 推し店コレクション */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Heart className="h-5 w-5 text-primary" />
              推し店コレクション
            </h2>
            <Link
              href="/explore"
              className="text-sm text-primary hover:underline"
            >
              お店を探す
            </Link>
          </div>

          {oshiShops.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <Heart className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                まだ推し店がありません
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/explore">お店を探す</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {oshiShops.map((shop) => (
                <Card
                  key={shop.id}
                  className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="h-32 bg-gradient-to-br from-warm to-secondary" />
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shop.owner_name}
                    </p>
                    {shop.stories[0] && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {shop.stories[0].summary}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 fill-primary text-primary" />
                        推し中
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {shop._count.empathy} 共感
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      {/* 共感した履歴 */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Clock className="h-5 w-5 text-primary" />
            共感した履歴
          </h2>

          {empathyHistory.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                まだ共感履歴がありません
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/explore">ストーリーを読む</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {empathyHistory.map((item) => {
                const tag = getEmpathyTag(item.tag_type);
                return (
                  <Link
                    key={item.id}
                    href={`/shops/${item.shop_slug}`}
                    className="block"
                  >
                    <Card className="transition-colors hover:bg-warm-light">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
                          {tag?.emoji ?? "👏"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">
                            {item.shop_name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {tag?.label} — {item.story_title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(item.date).toLocaleDateString("ja-JP")}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
