"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heart, MapPin, Clock, Phone, MessageCircle, Share2, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { getShopBySlug as getDummyShopBySlug } from "@/lib/dummy-data";
import { EMPATHY_TAGS } from "@/lib/constants";
import type { ShopWithRelations, Shop, Story, Menu } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [shop, setShop] = useState<ShopWithRelations | null | undefined>(undefined);
  const [isOshi, setIsOshi] = useState(false);
  const [oshiCount, setOshiCount] = useState(0);
  const [tappedTags, setTappedTags] = useState<Set<string>>(new Set());
  const [empathyCount, setEmpathyCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [isTogglingOshi, setIsTogglingOshi] = useState(false);

  // Check auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  // Load empathy state for the story
  const loadEmpathyState = useCallback(async (storyId: string) => {
    try {
      const res = await fetch(`/api/empathy/${storyId}`);
      if (res.ok) {
        const data = await res.json();
        setTappedTags(new Set(data.user_tapped_tags));
        setEmpathyCount(data.total);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Load oshi state
  const loadOshiState = useCallback(async (shopId: string) => {
    if (!isAuthenticated) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("oshi_shops")
        .select("id")
        .eq("user_id", user.id)
        .eq("shop_id", shopId)
        .maybeSingle();

      setIsOshi(!!data);
    } catch {
      // Ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    async function fetchShop() {
      try {
        const supabase = createClient();
        const { data: shopData, error } = await supabase
          .from("shops")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .single();

        if (error || !shopData) {
          const dummy = getDummyShopBySlug(slug);
          setShop(dummy ?? null);
          if (dummy) {
            setEmpathyCount(dummy._count.empathy);
            setOshiCount(dummy._count.oshi);
          }
          return;
        }

        const typedShop = shopData as Shop;
        const [storiesRes, menusRes, oshiRes] = await Promise.all([
          supabase
            .from("stories")
            .select("*")
            .eq("shop_id", typedShop.id)
            .eq("status", "published"),
          supabase.from("menus").select("*").eq("shop_id", typedShop.id),
          supabase
            .from("oshi_shops")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", typedShop.id),
        ]);

        const storyIds = (storiesRes.data as Story[] | null)?.map((s) => s.id) ?? [];
        let empathy = 0;
        if (storyIds.length > 0) {
          const empathyRes = await supabase
            .from("empathy_taps")
            .select("id", { count: "exact", head: true })
            .in("story_id", storyIds);
          empathy = empathyRes.count ?? 0;
        }

        const oshiCountVal = oshiRes.count ?? 0;

        const result: ShopWithRelations = {
          ...typedShop,
          stories: (storiesRes.data as Story[]) ?? [],
          menus: (menusRes.data as Menu[]) ?? [],
          _count: {
            oshi: oshiCountVal,
            empathy,
          },
        };
        setShop(result);
        setEmpathyCount(empathy);
        setOshiCount(oshiCountVal);

        // Load user-specific state
        if (storyIds.length > 0) {
          loadEmpathyState(storyIds[0]);
        }
        loadOshiState(typedShop.id);
      } catch {
        const dummy = getDummyShopBySlug(slug);
        setShop(dummy ?? null);
        if (dummy) {
          setEmpathyCount(dummy._count.empathy);
          setOshiCount(dummy._count.oshi);
        }
      }
    }
    fetchShop();
  }, [slug, loadEmpathyState, loadOshiState]);

  // Loading
  if (shop === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold">お店が見つかりません</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          お探しのお店は削除されたか、URLが正しくない可能性があります
        </p>
        <Button asChild className="mt-4">
          <Link href="/explore">お店を探す</Link>
        </Button>
      </div>
    );
  }

  const mainStory = shop.stories[0];
  const hoursDisplay = typeof shop.hours === "string" ? shop.hours : null;

  async function handleEmpathyTap(tagId: string) {
    if (!isAuthenticated) {
      router.push(`/login?next=/shops/${slug}`);
      return;
    }
    if (!mainStory || isTapping) return;

    setIsTapping(true);
    // Optimistic update
    setTappedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
        setEmpathyCount((c) => c - 1);
      } else {
        next.add(tagId);
        setEmpathyCount((c) => c + 1);
      }
      return next;
    });

    try {
      const res = await fetch("/api/empathy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: mainStory.id,
          tag_type: tagId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTappedTags(new Set(data.user_tapped_tags));
        setEmpathyCount(data.total);
      }
    } catch {
      // Revert on error
      loadEmpathyState(mainStory.id);
    } finally {
      setIsTapping(false);
    }
  }

  async function handleOshiToggle() {
    if (!isAuthenticated) {
      router.push(`/login?next=/shops/${slug}`);
      return;
    }
    if (isTogglingOshi) return;

    setIsTogglingOshi(true);
    // Optimistic update
    const wasOshi = isOshi;
    setIsOshi(!wasOshi);
    setOshiCount((c) => (wasOshi ? c - 1 : c + 1));

    try {
      const res = await fetch("/api/oshi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shop!.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsOshi(data.is_oshi);
        setOshiCount(data.oshi_count);
      }
    } catch {
      // Revert on error
      setIsOshi(wasOshi);
      setOshiCount((c) => (wasOshi ? c + 1 : c - 1));
    } finally {
      setIsTogglingOshi(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* パンくず */}
      <nav className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">ホーム</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/explore" className="transition-colors hover:text-foreground">お店を探す</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{shop.name}</span>
      </nav>

      {/* カバー画像 */}
      <div className="relative h-48 bg-gradient-to-br from-warm to-secondary md:h-64">
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary/20 text-2xl font-bold text-primary">
              {shop.owner_name[0]}
            </div>
            <div className="mb-1">
              <h1 className="text-lg font-bold text-foreground md:text-xl">
                {shop.name}
              </h1>
              <p className="text-sm text-muted-foreground">{shop.owner_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* アクションバー */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className={`h-4 w-4 ${isOshi ? "fill-primary text-primary" : ""}`} />
            {oshiCount} 推し
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {empathyCount} 共感
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator.share({ title: shop.name, url: window.location.href });
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={isOshi ? "secondary" : "default"}
            className="gap-1"
            onClick={handleOshiToggle}
            disabled={isTogglingOshi}
          >
            <Heart className={`h-4 w-4 ${isOshi ? "fill-current" : ""}`} />
            {isOshi ? "推し店登録済み" : "推し店に追加"}
          </Button>
        </div>
      </div>

      {/* タブ */}
      <Tabs defaultValue="story" className="px-4 py-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="story">ストーリー</TabsTrigger>
          <TabsTrigger value="menu">食べてほしい一品</TabsTrigger>
          <TabsTrigger value="info">店舗情報</TabsTrigger>
          <TabsTrigger value="fans">ファンの声</TabsTrigger>
        </TabsList>

        {/* ストーリータブ */}
        <TabsContent value="story" className="mt-4">
          {mainStory ? (
            <article>
              <h2 className="text-xl font-bold leading-snug">{mainStory.title}</h2>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {mainStory.body}
              </div>
            </article>
          ) : (
            <p className="py-8 text-center text-muted-foreground">ストーリーは準備中です。</p>
          )}

          {/* 共感タップ */}
          <div className="mt-8 rounded-lg border bg-warm-light p-4">
            <p className="text-center text-sm font-medium">このストーリーに共感しましたか？</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EMPATHY_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleEmpathyTap(tag.id)}
                  disabled={isTapping}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
                    tappedTags.has(tag.id)
                      ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md"
                      : "border-primary/30 bg-background text-primary hover:bg-primary/5 hover:border-primary/50 active:scale-95"
                  }`}
                >
                  {tag.emoji} {tag.label}
                </button>
              ))}
            </div>
            {tappedTags.size > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary animate-in fade-in duration-300">
                <Heart className="h-3.5 w-3.5 fill-primary" />
                共感を送りました！
              </div>
            )}
          </div>
        </TabsContent>

        {/* 食べてほしい一品タブ */}
        <TabsContent value="menu" className="mt-4">
          <div className="mb-4 rounded-lg bg-warm-light px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{shop.owner_name}</span>さんが「ぜひ食べてほしい」と語る、想いのこもった一品たち。
            </p>
          </div>
          <div className="space-y-6">
            {shop.menus.map((menu) => (
              <Card key={menu.id} className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary/60 to-primary/20" />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{menu.name}</h3>
                      {menu.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{menu.description}</p>
                      )}
                    </div>
                    {menu.price && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        ¥{menu.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {menu.owner_message && (
                    <div className="mt-3 border-l-2 border-primary/30 pl-3">
                      <p className="text-sm leading-relaxed text-foreground/85">
                        {menu.owner_message}
                      </p>
                      <p className="mt-2 text-right text-xs text-muted-foreground">
                        — {shop.owner_name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 店舗情報タブ */}
        <TabsContent value="info" className="mt-4">
          <div className="space-y-4">
            {shop.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">住所</p>
                  <p className="text-sm text-muted-foreground">{shop.address}</p>
                </div>
              </div>
            )}
            {hoursDisplay && (
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">営業時間</p>
                  <p className="text-sm text-muted-foreground">{hoursDisplay}</p>
                  {shop.holidays && (
                    <p className="text-xs text-muted-foreground">定休日: {shop.holidays}</p>
                  )}
                </div>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">電話番号</p>
                  <p className="text-sm text-muted-foreground">{shop.phone}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ファンの声タブ */}
        <TabsContent value="fans" className="mt-4">
          <div className="py-8 text-center text-sm text-muted-foreground">
            まだファンの声はありません。
            <br />
            最初の応援メッセージを送りませんか？
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
