"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  ChevronRight,
  Loader2,
  Mail,
  Store,
  Sparkles,
  TrendingUp,
  Calendar,
  Bell,
  Megaphone,
  UtensilsCrossed,
  Newspaper,
  Camera,
  Plus,
  Send,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EMPATHY_TAGS, VISIT_MOOD_TAGS } from "@/lib/constants";
import { WORDING } from "@/constants/wording";
import { createClient } from "@/lib/supabase/client";
import { trackCollectionShare } from "@/lib/tracking";
import { ShareButtons } from "@/components/share-buttons";
import { FanLetterModal } from "@/app/(consumer)/diary/fan-letter-modal";
import type { Shop, Story, VisitRecordWithShop } from "@/types/database";
import dynamic from "next/dynamic";
import { MapPin, List, Rss } from "lucide-react";

const MapView = dynamic(() => import("@/components/map-view").then(m => m.MapView), { ssr: false });
import { OshiFeed } from "@/components/oshi/oshi-feed";

type OshiShopWithRelations = Shop & {
  stories: Story[];
  _count: { empathy: number };
  latitude?: number | null;
  longitude?: number | null;
};

type EmpathyHistoryItem = {
  id: string;
  tag_type: string;
  story_title: string;
  shop_name: string;
  shop_slug: string;
  date: string;
};

type MessageItem = {
  id: string;
  shop_id: string;
  title: string;
  content: string;
  sent_at: string;
  shop_name: string;
  shop_slug: string;
  owner_name: string;
  is_read: boolean;
};

type ShopUpdate = {
  id: string;
  content: string;
  update_type: string;
  created_at: string;
  shop_name: string;
  shop_slug: string;
};

function getEmpathyTag(tagId: string) {
  return EMPATHY_TAGS.find((t) => t.id === tagId);
}

type ActiveTab = "feed" | "oshi" | "diary";

export default function OshiPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("feed");
  const [nickname, setNickname] = useState("");
  const [oshiShops, setOshiShops] = useState<OshiShopWithRelations[]>([]);
  const [empathyHistory, setEmpathyHistory] = useState<EmpathyHistoryItem[]>([]);
  const [oshiCount, setOshiCount] = useState(0);
  const [empathyCount, setEmpathyCount] = useState(0);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shopUpdates, setShopUpdates] = useState<ShopUpdate[]>([]);
  // ダイアリー関連
  const [diaryVisits, setDiaryVisits] = useState<VisitRecordWithShop[]>([]);
  const [fanLetterTarget, setFanLetterTarget] = useState<VisitRecordWithShop | null>(null);
  // 推し店マップ/リスト表示切り替え
  const [oshiViewMode, setOshiViewMode] = useState<"list" | "map">("list");

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/oshi");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.id)
        .single();

      const typedUser = userData as { nickname: string } | null;
      setNickname(typedUser?.nickname ?? user.user_metadata?.nickname ?? "ユーザー");

      try {
        const [oshiRes, msgRes, diaryRes] = await Promise.all([
          fetch("/api/oshi/my"),
          fetch("/api/messages"),
          fetch("/api/visits"),
        ]);

        if (diaryRes.ok) {
          const diaryData = await diaryRes.json();
          setDiaryVisits(diaryData.visits ?? []);
        }

        if (msgRes.ok) {
          const data = await msgRes.json();
          const msgs = (data.messages ?? []) as MessageItem[];
          setMessages(msgs);
          setUnreadCount(msgs.filter((m) => !m.is_read).length);
        }

        // 推し店の近況更新を取得
        if (oshiRes.ok) {
          const oshiData = await oshiRes.json().catch(() => ({ shops: [] }));
          const fetchedShops = (oshiData.shops ?? []) as OshiShopWithRelations[];
          setOshiShops(fetchedShops);
          setEmpathyHistory(oshiData.empathy_history ?? []);
          setOshiCount(oshiData.oshi_count ?? 0);
          setEmpathyCount(oshiData.empathy_count ?? 0);

          if (fetchedShops.length > 0) {
            const updatePromises = fetchedShops.map(async (shop) => {
              try {
                const res = await fetch(`/api/shops/${shop.slug}/updates`);
                if (!res.ok) return [];
                const d = await res.json();
                return ((d.updates ?? []) as { id: string; content: string; update_type: string; created_at: string }[])
                  .map((u) => ({
                    ...u,
                    shop_name: shop.name,
                    shop_slug: shop.slug,
                  }));
              } catch { return []; }
            });
            const allUpdates = (await Promise.all(updatePromises)).flat() as ShopUpdate[];
            allUpdates.sort((a, b) => b.created_at.localeCompare(a.created_at));
            setShopUpdates(allUpdates.slice(0, 10));
          }
        }
      } catch {
        // Ignore API errors
      }

      setIsLoading(false);
    }
    loadData();
  }, [router]);

  async function markAsRead(messageId: string) {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const moodTagMap = Object.fromEntries(VISIT_MOOD_TAGS.map((t) => [t.id, t]));

  return (
    <>
      {/* ヘッダー */}
      <section className="bg-warm px-4 pt-6 pb-0">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                推し店
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                あなたの推し店
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-primary" />
                {oshiCount}店
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                共感{empathyCount}回
              </span>
            </div>
          </div>

          {/* コレクション進捗 */}
          {oshiCount > 0 && (() => {
            const milestones = [3, 5, 10, 20, 50];
            const nextMilestone = milestones.find(m => m > oshiCount) ?? milestones[milestones.length - 1];
            const prevMilestone = milestones.filter(m => m <= oshiCount).pop() ?? 0;
            const progress = nextMilestone > prevMilestone
              ? ((oshiCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100
              : 100;
            const milestoneLabels: Record<number, string> = {
              3: "食通の卵",
              5: "こだわり探訪家",
              10: "街の食通",
              20: "食のコネクター",
              50: "オシドリマスター",
            };
            const currentLabel = milestones.filter(m => m <= oshiCount).map(m => milestoneLabels[m]).pop();
            return (
              <div className="mt-3">
                {currentLabel && (
                  <p className="text-xs text-primary font-medium mb-1">{currentLabel}</p>
                )}
                {oshiCount < nextMilestone && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-primary/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      あと{nextMilestone - oshiCount}店で「{milestoneLabels[nextMilestone]}」
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* タブ切り替え */}
          <div className="mt-4 flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("feed")}
              className={`flex-1 pb-2.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === "feed"
                  ? "text-[#E06A4E]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Rss className="h-3.5 w-3.5" />
                フィード
              </span>
              {activeTab === "feed" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E06A4E] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("oshi")}
              className={`flex-1 pb-2.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === "oshi"
                  ? "text-[#E06A4E]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                推し店
              </span>
              {activeTab === "oshi" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E06A4E] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("diary")}
              className={`flex-1 pb-2.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === "diary"
                  ? "text-[#E06A4E]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                ダイアリー
                {diaryVisits.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-0.5">
                    {diaryVisits.length}
                  </Badge>
                )}
              </span>
              {activeTab === "diary" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E06A4E] rounded-full" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* フィードタブ */}
      {activeTab === "feed" && (
        <section className="px-4 py-6 pb-24">
          <div className="mx-auto max-w-3xl">
            <OshiFeed />
          </div>
        </section>
      )}

      {/* ダイアリータブ */}
      {activeTab === "diary" && (
        <section className="px-4 py-6 pb-24">
          <div className="mx-auto max-w-3xl">
            {/* 記録ボタン */}
            <div className="flex justify-end mb-4">
              <Button size="sm" className="gap-1.5 bg-[#E06A4E] hover:bg-[#d0593d]" asChild>
                <Link href="/diary/new">
                  <Plus className="h-3.5 w-3.5" />
                  記録する
                </Link>
              </Button>
            </div>

            {diaryVisits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E06A4E]/10">
                  <Camera className="h-6 w-6 text-[#E06A4E]" />
                </div>
                <h3 className="text-balance text-base font-bold text-[#2C3E50]">まだ記録がありません</h3>
                <p className="text-pretty mt-1 text-sm text-muted-foreground">
                  推しのお店に行ったら、写真やひとことを記録してみましょう
                </p>
                <Button className="mt-4 gap-1.5 bg-[#E06A4E] hover:bg-[#d0593d]" asChild>
                  <Link href="/diary/new">
                    <Camera className="h-4 w-4" />
                    はじめての記録をつける
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {diaryVisits.map((visit) => {
                  const mood = visit.mood_tag ? moodTagMap[visit.mood_tag] : null;
                  return (
                    <div
                      key={visit.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex gap-3">
                        {visit.photo_url ? (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                            <Image
                              src={visit.photo_url}
                              alt="来店写真"
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            <Camera className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/shops/${visit.shop_slug}`}
                            className="text-sm font-bold text-[#2C3E50] hover:text-[#E06A4E] transition-colors"
                          >
                            {visit.shop_name}
                            <ChevronRight className="inline h-3 w-3 ml-0.5" />
                          </Link>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(visit.visited_at).toLocaleDateString("ja-JP", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          {mood && (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] text-[#E06A4E]">
                              {mood.emoji} {mood.label}
                            </span>
                          )}
                          {visit.memo && (
                            <p className="mt-1.5 text-xs text-gray-600 line-clamp-2">{visit.memo}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
                        <span className="text-[10px] text-gray-400">
                          {visit.is_public ? "🌐 公開" : "🔒 非公開"}
                        </span>
                        <button
                          onClick={() => setFanLetterTarget(visit)}
                          className="flex items-center gap-1 text-xs text-[#E06A4E] hover:text-[#d0593d] transition-colors"
                        >
                          <Send className="h-3 w-3" />
                          ファンレターを送る
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ファンレターモーダル */}
      {fanLetterTarget && (
        <FanLetterModal
          visit={fanLetterTarget}
          onClose={() => setFanLetterTarget(null)}
          onSent={() => setFanLetterTarget(null)}
        />
      )}

      {/* 推し店一覧 */}
      {activeTab === "oshi" && <>
      <section className="px-4 py-6">
        <div className="mx-auto max-w-3xl">
          {/* リスト/マップ切り替え */}
          {oshiShops.length > 0 && (
            <div className="flex justify-end mb-3">
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                <button
                  onClick={() => setOshiViewMode("list")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    oshiViewMode === "list" ? "bg-[#E06A4E] text-white" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  リスト
                </button>
                <button
                  onClick={() => setOshiViewMode("map")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    oshiViewMode === "map" ? "bg-[#E06A4E] text-white" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  マップ
                </button>
              </div>
            </div>
          )}

          {/* マップビュー */}
          {oshiViewMode === "map" && oshiShops.length > 0 && (
            <div className="mb-4">
              <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200">
                <MapView
                  shops={oshiShops
                    .filter((s) => s.latitude && s.longitude)
                    .map((s) => ({
                      slug: s.slug,
                      name: s.name,
                      area: s.area ?? "",
                      category: s.category ?? "",
                      latitude: s.latitude!,
                      longitude: s.longitude!,
                    }))}
                  onShopClick={(slug) => router.push(`/shops/${slug}`)}
                />
              </div>
              {oshiShops.filter((s) => !s.latitude || !s.longitude).length > 0 && (
                <p className="mt-2 text-[11px] text-gray-400 text-center">
                  位置情報のない店舗はマップに表示されません
                </p>
              )}
            </div>
          )}

          {oshiShops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-primary/20 bg-warm/30 p-8 text-center">
              <Heart className="mx-auto h-12 w-12 text-primary/30" />
              <p className="text-balance mt-4 text-base font-medium text-[#2C3E50]">
                まだ推し店がありません
              </p>
              <p className="text-pretty mt-2 text-sm text-muted-foreground">
                ストーリーを読んで共感したら「推す」ボタンで推そう
              </p>
              <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <Button asChild className="gap-1.5">
                  <Link href="/explore">
                    <Sparkles className="h-4 w-4" />
                    ストーリーを探す
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {oshiShops.map((shop) => (
                <div key={shop.id}>
                  <Link
                    href={`/shops/${shop.slug}`}
                    className="block"
                  >
                    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      <CardContent className="flex items-center gap-3 p-3">
                        {/* 店舗サムネイル */}
                        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
                          {shop.image_url ? (
                            <Image
                              src={shop.image_url}
                              alt={shop.name}
                              fill
                              sizes="72px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E06A4E]/20 to-orange-50">
                              <Store className="h-6 w-6 text-primary/40" />
                            </div>
                          )}
                        </div>

                        {/* テキスト情報 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-bold text-[#2C3E50] leading-tight truncate">
                              {shop.name}
                            </p>
                            <Heart className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
                          </div>
                          {shop.area && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {shop.area}
                            </p>
                          )}
                          {(shop.stories[0]?.catchcopy_primary || shop.stories[0]?.summary || shop.description) && (
                            <p className="mt-1 text-[12px] text-muted-foreground leading-snug line-clamp-2">
                              {shop.stories[0]?.catchcopy_primary ?? shop.stories[0]?.summary ?? shop.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <TrendingUp className="h-3 w-3" />
                              共感{shop._count.empathy}回
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" />
                              {shop.stories.length}本のストーリー
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                      </CardContent>
                    </Card>
                  </Link>
                  {/* 来店記録ボタン */}
                  <div className="flex justify-end mt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs text-[#E06A4E] hover:text-[#d0593d] hover:bg-orange-50"
                      asChild
                    >
                      <Link href={`/diary/new?shopId=${shop.id}`}>
                        <Camera className="h-3 w-3" />
                        来店記録をつける
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}

              {/* シェアボタン */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <ShareButtons
                  url={`https://oshidori.vercel.app/oshi?shared=true`}
                  title={`${nickname}の推し店（${oshiCount}店） | オシドリ`}
                  text={`こだわりの飲食店を${oshiCount}店推し中！ #オシドリ`}
                  mode="inline"
                  onShare={() => trackCollectionShare({ shopCount: oshiCount, nickname })}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 推し店の新着情報 */}
      {shopUpdates.length > 0 && (
        <>
          <Separator className="mx-auto max-w-3xl" />
          <section className="px-4 py-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Bell className="h-4 w-4 text-primary" />
                推し店の新着情報
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                推し中のお店からの最新ニュース
              </p>

              <div className="mt-3 space-y-2">
                {shopUpdates.map((update) => {
                  const typeIcon = update.update_type === "menu_update"
                    ? <UtensilsCrossed className="h-3.5 w-3.5" />
                    : update.update_type === "announcement"
                      ? <Megaphone className="h-3.5 w-3.5" />
                      : <Newspaper className="h-3.5 w-3.5" />;
                  const typeLabel = update.update_type === "menu_update"
                    ? "メニュー"
                    : update.update_type === "announcement"
                      ? "お知らせ"
                      : "近況";
                  return (
                    <Link
                      key={update.id}
                      href={`/shops/${update.shop_slug}`}
                      className="block"
                    >
                      <Card className="transition-colors hover:bg-warm-light">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              {typeIcon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium">{update.shop_name}</span>
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                  {typeLabel}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {update.content}
                              </p>
                              <span className="mt-1 block text-[10px] text-muted-foreground/70">
                                {new Date(update.created_at).toLocaleDateString("ja-JP", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* 推し店からのメッセージ */}
      {messages.length > 0 && (
        <>
          <Separator className="mx-auto max-w-3xl" />
          <section className="px-4 py-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Mail className="h-4 w-4 text-primary" />
                お店からのメッセージ
                {unreadCount > 0 && (
                  <Badge variant="default" className="text-[10px] px-1.5">
                    {unreadCount}件
                  </Badge>
                )}
              </h2>

              <div className="mt-3 space-y-2">
                {messages.slice(0, 10).map((msg) => (
                  <Card
                    key={msg.id}
                    className={`transition-colors ${!msg.is_read ? "border-primary/30 bg-primary/5" : ""}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Store className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {msg.shop_name}
                            </span>
                            {!msg.is_read && (
                              <Badge variant="default" className="text-[9px] px-1 py-0">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <h3 className="mt-0.5 text-[13px] font-semibold">{msg.title}</h3>
                          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                            {msg.content}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(msg.sent_at).toLocaleDateString("ja-JP")}
                            </span>
                            {!msg.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] text-primary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  markAsRead(msg.id);
                                }}
                              >
                                既読にする
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* あなたの好み分析 */}
      {empathyHistory.length > 0 && (
        <>
          <Separator className="mx-auto max-w-3xl" />
          <section className="px-4 py-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="h-4 w-4 text-primary" />
                あなたの好み
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                共感タップの傾向から見える、あなたの「好き」
              </p>

              <Card className="mt-3">
                <CardContent className="p-4">
                  {(() => {
                    const tagCounts = new Map<string, number>();
                    for (const item of empathyHistory) {
                      tagCounts.set(item.tag_type, (tagCounts.get(item.tag_type) ?? 0) + 1);
                    }
                    const sorted = [...tagCounts.entries()].sort(([, a], [, b]) => b - a);
                    const maxCount = sorted[0]?.[1] ?? 1;

                    return (
                      <div className="space-y-2.5">
                        {sorted.slice(0, 5).map(([tagId, count]) => {
                          const tag = getEmpathyTag(tagId);
                          if (!tag) return null;
                          const pct = Math.round((count / maxCount) * 100);
                          return (
                            <div key={tagId} className="flex items-center gap-3">
                              <span className="w-5 text-center text-base">{tag.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between">
                                  <span className="text-[13px] font-medium">{tag.label}</span>
                                  <span className="text-[11px] text-muted-foreground">{count}回</span>
                                </div>
                                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                  <div
                                    className="h-full rounded-full bg-primary/70 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}

      {/* 共感した履歴 */}
      <Separator className="mx-auto max-w-3xl" />
      <section className="px-4 py-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <MessageCircle className="h-4 w-4 text-primary" />
            共感した履歴
          </h2>

          {empathyHistory.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                まだ共感履歴がありません
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/explore">ストーリーを読む</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {empathyHistory.map((item) => {
                const tag = getEmpathyTag(item.tag_type);
                return (
                  <Link
                    key={item.id}
                    href={`/shops/${item.shop_slug}`}
                    className="block"
                  >
                    <Card className="transition-colors hover:bg-warm-light">
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base">
                          {tag?.emoji ?? "👏"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium leading-snug">
                            {item.shop_name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {tag?.label} — {item.story_title}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {new Date(item.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
      </>}
    </>
  );
}
