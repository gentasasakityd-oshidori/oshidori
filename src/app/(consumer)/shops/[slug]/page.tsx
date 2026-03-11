"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heart, MapPin, Clock, Phone, ChevronLeft, Check, CalendarClock, Send, Megaphone, ChevronRight, BookOpen, Sparkles, Globe, ExternalLink, Train } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getShopBySlug as getDummyShopBySlug } from "@/lib/dummy-data";
import { EMPATHY_TAGS, STORY_PERSPECTIVE_LABELS, BUDGET_LABELS, POC_FREE_MODE, SMOKING_POLICIES, PRIVATE_ROOM_OPTIONS } from "@/lib/constants";
import { generateShopEmpathyCards } from "@/lib/shop-empathy-cards";
import { WORDING } from "@/constants/wording";
import { THEME_TO_DISPLAY_TAG } from "@/lib/display-tags";
import type { ShopWithRelations, Shop, Story, Menu } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { trackEmpathyTap, trackOshiToggle, trackShopView, trackStoryView, trackStoryViewComplete, trackReservationInquiry } from "@/lib/posthog";
import dynamic from "next/dynamic";
import { ShareButtons } from "@/components/share-buttons";
import { SocialProof } from "@/components/social-proof";
import { StoryReader } from "@/components/story-reader";

const EngagementPrompt = dynamic(() => import("@/components/engagement-prompt").then(m => m.EngagementPrompt), { ssr: false });
const ExperienceProfile = dynamic(() => import("@/components/experience-profile").then(m => m.ExperienceProfile), { ssr: false });
const CheckinOshiFlow = dynamic(() => import("@/components/checkin-oshi-flow").then(m => m.CheckinOshiFlow), { ssr: false });
const ShopMap = dynamic(() => import("@/components/shop-map").then(m => m.ShopMap), { ssr: false });
import { trackStoryViewStart, trackStoryScrollDepth, trackQRAccess, trackUserLastAction, trackFanClubJoin, trackFanClubLeave } from "@/lib/tracking";

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
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyOpenedAt, setStoryOpenedAt] = useState<number | null>(null);
  // 予約打診
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [reservationPartySize, setReservationPartySize] = useState("2");
  const [reservationMessage, setReservationMessage] = useState("");
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationSent, setReservationSent] = useState(false);
  // 応援者一覧
  const [fans, setFans] = useState<{ id: string; nickname: string; push_reason: string | null; registered_at: string }[]>([]);
  const [fanCount, setFanCount] = useState(0);
  // 近況更新
  const [shopUpdates, setShopUpdates] = useState<{ id: string; content: string; created_at: string }[]>([]);
  // 在庫速報
  const [supplyFlashPosts, setSupplyFlashPosts] = useState<Array<{
    id: string; title: string; description: string | null; image_url: string | null;
    supply_type: string; remaining_count: number | null; expires_at: string | null; created_at: string;
  }>>([]);
  // ファンクラブ
  const [fanClubPlan, setFanClubPlan] = useState<{ plan_name: string; price: number; description: string | null; benefits: unknown } | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  // コンテンツタブ（店舗情報は常時表示のためタブから除外）
  const [activeContentTab, setActiveContentTab] = useState<"story" | "menu">("story");
  // チェックイン同時フロー
  const [showCheckinFlow, setShowCheckinFlow] = useState(false);
  // マイクロインタラクション
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; x: number; delay: number }>>([]);
  const [confettiParticles, setConfettiParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const [tagBounced, setTagBounced] = useState(false);
  const tagSectionRef = useRef<HTMLDivElement>(null);
  const heartIdRef = useRef(0);
  const confettiIdRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
      // QRコード経由: ログイン済みならチェックインフロー表示
      if (user && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("from") === "qr") {
          setShowCheckinFlow(true);
        }
      }
    });
    // QRコード経由アクセスのトラッキング
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("from") === "qr") {
        trackQRAccess({ shopSlug: slug });
      }
    }
  }, [slug]);

  // タグバウンス: IntersectionObserverでビューポート進入時に発火
  useEffect(() => {
    if (tagBounced || !tagSectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTagBounced(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(tagSectionRef.current);
    return () => observer.disconnect();
  }, [tagBounced, shop]);

  const loadEmpathyState = useCallback(async (storyId: string) => {
    try {
      const res = await fetch(`/api/empathy/${storyId}`);
      if (res.ok) {
        const data = await res.json();
        setTappedTags(new Set(data.user_tapped_tags));
        setEmpathyCount(data.total);
      }
    } catch { /* ignore */ }
  }, []);

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
    } catch { /* ignore */ }
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
            if (dummy.fan_club_plan) setFanClubPlan(dummy.fan_club_plan);
          }
          return;
        }

        const typedShop = shopData as Shop;
        const [storiesRes, menusRes, oshiRes, displayTagsRes, structuredTagsRes] = await Promise.all([
          supabase.from("stories").select("*").eq("shop_id", typedShop.id).eq("status", "published"),
          supabase.from("menus").select("*").eq("shop_id", typedShop.id),
          supabase.from("oshi_shops").select("id", { count: "exact", head: true }).eq("shop_id", typedShop.id),
          supabase.from("display_tags").select("*").eq("shop_id", typedShop.id).order("priority", { ascending: false }),
          supabase.from("shop_structured_tags").select("*").eq("shop_id", typedShop.id),
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

        const result: ShopWithRelations = {
          ...typedShop,
          stories: (storiesRes.data as Story[]) ?? [],
          menus: (menusRes.data as Menu[]) ?? [],
          display_tags: (displayTagsRes.data as ShopWithRelations["display_tags"]) ?? [],
          structured_tags: (structuredTagsRes.data as ShopWithRelations["structured_tags"]) ?? [],
          _count: { oshi: oshiRes.count ?? 0, empathy },
        };
        setShop(result);
        setEmpathyCount(empathy);
        setOshiCount(oshiRes.count ?? 0);

        trackShopView({ shopSlug: typedShop.slug, shopName: typedShop.name, area: typedShop.area, category: typedShop.category });
        if (result.stories[0]) {
          trackStoryView({ storyId: result.stories[0].id, shopSlug: typedShop.slug, shopName: typedShop.name });
        }

        if (storyIds.length > 0) loadEmpathyState(storyIds[0]);
        loadOshiState(typedShop.id);

        fetch(`/api/shops/${slug}/fans`).then(r => r.ok ? r.json() : null).then(d => {
          if (d) { setFans(d.fans ?? []); setFanCount(d.total ?? 0); }
        }).catch(() => {});
        fetch(`/api/shops/${slug}/updates`).then(r => r.ok ? r.json() : null).then(d => {
          if (d) setShopUpdates(d.updates ?? []);
        }).catch(() => {});
        // ファンクラブプラン取得
        fetch(`/api/fan-club?shopId=${typedShop.id}`).then(r => r.ok ? r.json() : null).then(d => {
          if (d?.plan) setFanClubPlan(d.plan);
        }).catch(() => {});
        // 在庫速報取得
        fetch(`/api/supply-flash?shopId=${typedShop.id}`).then(r => r.ok ? r.json() : null).then(d => {
          if (d?.posts) setSupplyFlashPosts(d.posts);
        }).catch(() => {});
      } catch {
        const dummy = getDummyShopBySlug(slug);
        setShop(dummy ?? null);
        if (dummy) { setEmpathyCount(dummy._count.empathy); setOshiCount(dummy._count.oshi); if (dummy.fan_club_plan) setFanClubPlan(dummy.fan_club_plan); }
      }
    }
    fetchShop();
  }, [slug, loadEmpathyState, loadOshiState]);

  if (shop === undefined) {
    return (
      <div className="mx-auto max-w-3xl">
        {/* スケルトン: ヒーロー画像 */}
        <div className="aspect-[16/9] w-full animate-skeleton" />
        {/* スケルトン: 店舗情報 */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full animate-skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 animate-skeleton" />
              <div className="h-3.5 w-1/2 animate-skeleton" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-20 rounded-full animate-skeleton" />
            <div className="h-6 w-24 rounded-full animate-skeleton" />
            <div className="h-6 w-16 rounded-full animate-skeleton" />
          </div>
        </div>
        {/* スケルトン: ボタン */}
        <div className="px-4 pb-4">
          <div className="h-10 w-full rounded-xl animate-skeleton" />
        </div>
        {/* スケルトン: ストーリー */}
        <div className="border-t border-gray-100 px-4 py-5 space-y-3">
          <div className="h-4 w-40 animate-skeleton" />
          <div className="rounded-xl bg-gray-50 p-4 space-y-2">
            <div className="h-3.5 w-full animate-skeleton" />
            <div className="h-3.5 w-5/6 animate-skeleton" />
            <div className="h-3.5 w-2/3 animate-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <span className="text-2xl text-gray-300">🍽</span>
        </div>
        <h2 className="text-balance text-lg font-bold text-[#2C3E50]">お店が見つかりません</h2>
        <p className="text-pretty mt-2 text-center text-sm text-gray-400">
          お探しのお店は削除されたか、URLが正しくない可能性があります
        </p>
        <Button asChild className="mt-4">
          <Link href="/explore">お店を探す</Link>
        </Button>
      </div>
    );
  }

  const mainStory = shop.stories[0];
  const hoursDisplay: string | null = typeof shop.hours === "string" ? (shop.hours as string) : null;

  // C-12: Collect all photos for carousel (shop image + menu photos)
  const allPhotos: string[] = [];
  if (shop.image_url) allPhotos.push(shop.image_url);
  for (const menu of shop.menus) {
    if (menu.photo_url && !allPhotos.includes(menu.photo_url)) {
      allPhotos.push(menu.photo_url);
    }
  }

  // Display tags from DB or story_themes fallback
  const displayTags: Array<{ icon: string; label: string }> = (() => {
    if (shop.display_tags && shop.display_tags.length > 0) {
      return shop.display_tags.slice(0, 3).map((t) => ({ icon: t.icon, label: t.label }));
    }
    if (!mainStory?.story_themes) return [];
    const themes = mainStory.story_themes as Record<string, number>;
    return Object.entries(themes)
      .filter(([key]) => key in THEME_TO_DISPLAY_TAG)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => THEME_TO_DISPLAY_TAG[key]);
  })();

  // ハートフロートを生成
  function spawnHearts() {
    const newHearts = Array.from({ length: 3 }, (_, i) => ({
      id: ++heartIdRef.current,
      x: (Math.random() - 0.5) * 40,
      delay: i * 100,
    }));
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.find((n) => n.id === h.id)));
    }, 800);
  }

  // コンフェティを生成
  function spawnConfetti() {
    const colors = ["#E06A4E", "#F5A623", "#E88FAB", "#FFD700", "#8B5CF6"];
    const particles = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 30 + Math.random() * 40;
      return {
        id: ++confettiIdRef.current,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 20,
        color: colors[i % colors.length],
      };
    });
    setConfettiParticles((prev) => [...prev, ...particles]);
    setTimeout(() => {
      setConfettiParticles((prev) => prev.filter((p) => !particles.find((n) => n.id === p.id)));
    }, 1000);
  }

  async function handleEmpathyTap(tagId: string) {
    if (!isAuthenticated) { router.push(`/login?next=/shops/${slug}`); return; }
    if (!mainStory || isTapping) return;
    setIsTapping(true);
    const wasTapped = tappedTags.has(tagId);
    trackEmpathyTap({ storyId: mainStory.id, shopSlug: slug, tagType: tagId, action: wasTapped ? "untap" : "tap" });
    if (!wasTapped) {
      trackUserLastAction({ actionType: "empathy_tap", shopId: shop!.id });
      // ハートフロート + 触覚フィードバック
      spawnHearts();
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    }
    setTappedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) { next.delete(tagId); setEmpathyCount((c) => c - 1); }
      else { next.add(tagId); setEmpathyCount((c) => c + 1); }
      return next;
    });
    try {
      const res = await fetch("/api/empathy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: mainStory.id, tag_type: tagId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTappedTags(new Set(data.user_tapped_tags));
        setEmpathyCount(data.total);
      }
    } catch { loadEmpathyState(mainStory.id); }
    finally { setIsTapping(false); }
  }

  async function handleOshiToggle() {
    if (!isAuthenticated) { router.push(`/login?next=/shops/${slug}`); return; }
    if (isTogglingOshi) return;
    setIsTogglingOshi(true);
    const wasOshi = isOshi;
    setIsOshi(!wasOshi);
    setOshiCount((c) => (wasOshi ? c - 1 : c + 1));
    trackOshiToggle({ shopId: shop!.id, shopSlug: slug, action: wasOshi ? "unregister" : "register" });
    if (!wasOshi) {
      trackUserLastAction({ actionType: "oshi_toggle", shopId: shop!.id });
      // コンフェティ + 触覚フィードバック
      spawnConfetti();
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    }
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
      setIsOshi(wasOshi);
      setOshiCount((c) => (wasOshi ? c + 1 : c - 1));
    } finally { setIsTogglingOshi(false); }
  }

  async function handleReservationSubmit() {
    if (!isAuthenticated) { router.push(`/login?next=/shops/${slug}`); return; }
    if (!reservationDate || !reservationTime || reservationSubmitting) return;
    setReservationSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shop!.id,
          preferred_date: reservationDate,
          preferred_time: reservationTime,
          party_size: Number(reservationPartySize),
          message: reservationMessage || undefined,
        }),
      });
      if (res.ok) {
        setReservationSent(true);
        setShowReservationForm(false);
        trackReservationInquiry({ shopSlug: slug, partySize: Number(reservationPartySize), reservationDate });
      }
    } catch { /* ignore */ }
    finally { setReservationSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Floating header */}
      <div className="sticky top-14 z-40 flex items-center justify-between bg-white/90 px-4 py-2 backdrop-blur md:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500">
          <ChevronLeft className="h-4 w-4" />
          <span>戻る</span>
        </button>
        <ShareButtons
          url={typeof window !== "undefined" ? window.location.href : `https://oshidori.vercel.app/shops/${slug}`}
          title={shop.name}
          text={`${shop.name}のストーリー | オシドリ`}
        />
      </div>

      {/* Hero photo - 16:9 aspect with carousel */}
      <div
        className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[#E06A4E]/80 to-[#B8533D]/60"
        onTouchStart={(e) => {
          if (allPhotos.length <= 1) return;
          const startX = e.touches[0].clientX;
          const el = e.currentTarget;
          const handleEnd = (ev: TouchEvent) => {
            const diff = startX - ev.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
              setPhotoIndex((prev) =>
                diff > 0
                  ? Math.min(prev + 1, allPhotos.length - 1)
                  : Math.max(prev - 1, 0)
              );
            }
            el.removeEventListener("touchend", handleEnd);
          };
          el.addEventListener("touchend", handleEnd);
        }}
      >
        {allPhotos.length > 0 ? (
          <>
            <Image
              src={allPhotos[photoIndex]}
              alt={`${shop.name} 写真 ${photoIndex + 1}`}
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 768px) 100vw, 768px"
              priority={photoIndex === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            {mainStory?.catchcopy_primary ? (
              <p className="px-8 text-center text-2xl font-bold text-white" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                {mainStory.catchcopy_primary}
              </p>
            ) : (
              <span className="text-5xl text-white/30">🍽</span>
            )}
          </div>
        )}
        {/* L1 Catchcopy overlay */}
        {mainStory?.catchcopy_primary && allPhotos.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-lg font-bold leading-snug text-white drop-shadow-lg" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              {mainStory.catchcopy_primary}
            </p>
          </div>
        )}
        {/* Photo counter dots */}
        {allPhotos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allPhotos.map((_, i) => (
              <button
                key={i}
                onClick={() => setPhotoIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === photoIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shop info header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {shop.owner_image_url ? (
            <Image
              src={shop.owner_image_url}
              alt={shop.owner_name}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E06A4E]/10 text-lg font-bold text-[#E06A4E]">
              {shop.owner_name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-balance text-lg font-bold text-[#2C3E50] leading-snug">{shop.name}</h1>
            <p className="text-sm text-gray-500">
              {shop.area} · {shop.category}
            </p>
          </div>
        </div>

        {/* Display tags (タグバウンスアニメーション付き) */}
        {displayTags.length > 0 && (
          <div ref={tagSectionRef} className="mt-2 flex flex-wrap gap-2">
            {displayTags.map((tag, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-600 ${
                  tagBounced ? "animate-tag-bounce" : ""
                }`}
                style={tagBounced ? { animationDelay: `${i * 80}ms`, animationFillMode: "both" } : undefined}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Social proof */}
      <div className="px-4">
        <SocialProof shopId={shop.id} oshiCount={oshiCount} />
      </div>

      {/* Oshi button - コンパクト版（常時表示）+ コンフェティ */}
      <div className="relative px-4 pb-4 pt-2">
        <Button
          className={`w-full gap-2 rounded-xl py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${
            isOshi
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
              : "bg-[#E06A4E] text-white hover:bg-[#d0593d]"
          }`}
          onClick={handleOshiToggle}
          disabled={isTogglingOshi}
        >
          <Heart className={`h-4 w-4 ${isOshi ? "fill-[#E06A4E] text-[#E06A4E]" : ""}`} />
          {isOshi ? WORDING.FAVORITE_REGISTERED : WORDING.ADD_TO_FAVORITES}
        </Button>
        {/* コンフェティパーティクル */}
        {confettiParticles.map((p) => (
          <span
            key={p.id}
            className="absolute animate-confetti text-sm"
            style={{
              left: "50%",
              top: "50%",
              color: p.color,
              "--confetti-x": `${p.x}px`,
              "--confetti-y": `${p.y}px`,
            } as React.CSSProperties}
          >
            ●
          </span>
        ))}
      </div>

      {/* このお店のこだわり */}
      {displayTags.length > 0 && mainStory && (
        <section className="border-t border-gray-100 px-4 py-5">
          <h2 className="text-sm font-bold text-[#2C3E50] mb-3">このお店のこだわり</h2>
          <div className="space-y-2.5">
            {displayTags.map((tag, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-lg mt-0.5">{tag.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[#2C3E50]">{tag.label}</p>
                  {mainStory.key_quotes && Array.isArray(mainStory.key_quotes) && mainStory.key_quotes[i] && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {String(mainStory.key_quotes[i])}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 店主の推しメニュー（タブの上に常時表示） */}
      {shop.menus.length > 0 && (
        <section className="px-4 py-4 bg-gradient-to-br from-orange-50/40 to-amber-50/20 border-t border-orange-100/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔥</span>
            <h2 className="text-sm font-bold text-[#2C3E50]">店主の推しメニュー</h2>
            <span className="text-[10px] text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">一次情報</span>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-none -mx-1 px-1 pr-4">
            {shop.menus.slice(0, 5).map((menu) => (
              <div key={menu.id} className="snap-start shrink-0 w-[75vw] max-w-[300px] min-w-[250px]">
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  {menu.photo_url && (
                    <div className="relative h-36 overflow-hidden">
                      <Image src={menu.photo_url} alt={menu.name} fill className="object-cover" sizes="300px" />
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        🔥 推し
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-[15px] font-bold text-[#2C3E50]">{menu.name}</h3>
                      {menu.price && (
                        <span className="shrink-0 text-sm font-semibold text-[#E06A4E]">
                          ¥{menu.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {/* 店主のコメント（一次情報: 食べログにはない情報） */}
                    {menu.owner_message && (
                      <div className="mt-2 border-l-2 border-[#E06A4E]/30 pl-2.5">
                        <p className="text-[12px] italic leading-relaxed text-[#2C3E50]/80">
                          「{menu.owner_message}」
                        </p>
                        <p className="mt-0.5 text-right text-[10px] text-gray-400">— {shop.owner_name}</p>
                      </div>
                    )}
                    {menu.description && !menu.owner_message && (
                      <p className="mt-1.5 text-[11px] text-gray-500 line-clamp-2">{menu.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* コンテンツタブ（ストーリー / メニューのみ。店舗情報は常時表示） */}
      <div className="border-t border-gray-100">
        <div className="flex">
          {(["story", "menu"] as const).map((tab) => {
            const labels = { story: "ストーリー", menu: "メニュー" };
            const icons = { story: "📖", menu: "🍽" };
            return (
              <button
                key={tab}
                onClick={() => setActiveContentTab(tab)}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative ${
                  activeContentTab === tab ? "text-[#E06A4E]" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  {icons[tab]} {labels[tab]}
                </span>
                {activeContentTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E06A4E] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ストーリータブ */}
      {activeContentTab === "story" && mainStory && (
        <section className="px-4 py-5">
          <h2 className="text-sm font-bold text-[#2C3E50] mb-1">このお店のストーリー</h2>
          <p className="text-[11px] text-gray-400 mb-3 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            オシドリ編集部が取材しました
          </p>

          <div className="rounded-xl bg-[#F9F9F6] p-4">
            {/* プレビューテキスト（常時表示） */}
            {!showStoryModal && (
              <>
                {mainStory.highlight ? (
                  <p className="text-sm leading-relaxed text-[#2C3E50]/85">
                    {mainStory.highlight}
                  </p>
                ) : mainStory.summary ? (
                  <p className="text-sm leading-relaxed text-[#2C3E50]/85">
                    {mainStory.summary}
                  </p>
                ) : null}
                <button
                  onClick={() => {
                    setShowStoryModal(true);
                    setStoryOpenedAt(Date.now());
                    trackStoryViewStart({ shopId: shop.id, storyId: mainStory.id, from: "detail" });
                  }}
                  className="mt-3 flex items-center gap-1 text-sm font-medium text-[#E06A4E] hover:text-[#d0593d] transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  ストーリーを読む
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* インライン展開（全文） */}
            {showStoryModal && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-balance text-lg font-bold leading-snug text-[#2C3E50]">{mainStory.title}</h3>
                {mainStory.body && (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {(() => {
                        const minutes = Math.ceil(mainStory.body.length / 500);
                        return minutes < 1 ? "1分以内で読めます" : `約${minutes}分で読めます`;
                      })()}
                    </p>
                    <StoryReader text={mainStory.body} title={mainStory.title} />
                  </div>
                )}
                <div className="mt-4 space-y-4">
                  {(mainStory.body || "").split(/\n\n+/).filter(Boolean).map((paragraph, idx) => {
                    const perspective = STORY_PERSPECTIVE_LABELS.find((label) =>
                      label.keywords.some((kw) => paragraph.includes(kw))
                    );
                    return (
                      <div key={idx} className="relative">
                        {perspective && (
                          <span className={`mb-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${perspective.color}`}>
                            {perspective.emoji} {perspective.label}
                          </span>
                        )}
                        <p className="whitespace-pre-line text-base leading-[1.9] text-[#2C3E50]/90">
                          {paragraph}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* C-13: 共感タップをストーリー末尾にインライン配置（店舗固有カード対応） */}
                <div className="mt-6 border-t border-gray-200/60 pt-4">
                  <p className="text-center text-sm font-medium text-[#2C3E50] mb-3">このストーリーに共感しましたか？</p>
                  <div className="relative flex flex-wrap justify-center gap-2">
                    {generateShopEmpathyCards(mainStory, shop.structured_tags).map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleEmpathyTap(tag.id)}
                        disabled={isTapping}
                        className={`relative rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
                          tappedTags.has(tag.id)
                            ? "border-[#E06A4E] bg-[#E06A4E] text-white scale-105 shadow-sm"
                            : "border-[#E06A4E]/30 bg-white text-[#E06A4E] hover:bg-[#E06A4E]/5 active:scale-95"
                        }`}
                      >
                        {tag.emoji} {tag.label}
                      </button>
                    ))}
                    {/* ハートフロートアニメーション */}
                    {floatingHearts.map((heart) => (
                      <span
                        key={heart.id}
                        className="absolute animate-heart-float text-lg"
                        style={{
                          left: `calc(50% + ${heart.x}px)`,
                          bottom: "100%",
                          animationDelay: `${heart.delay}ms`,
                          animationFillMode: "both",
                        }}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>
                  {tappedTags.size > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#E06A4E] animate-in fade-in duration-300">
                      <Heart className="h-3.5 w-3.5 fill-[#E06A4E]" />
                      共感を送りました！
                    </div>
                  )}
                </div>

                {/* エンゲージメント促進プロンプト */}
                <EngagementPrompt shopId={shop.id} storyId={mainStory.id} visible={showStoryModal} />

                <button
                  onClick={() => {
                    if (storyOpenedAt && mainStory) {
                      trackStoryViewComplete({ storyId: mainStory.id, shopSlug: slug, readDurationSec: Math.round((Date.now() - storyOpenedAt) / 1000) });
                    }
                    setShowStoryModal(false);
                  }}
                  className="mt-4 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 体験プロファイル — 来店者の声から見える魅力 */}
      {activeContentTab === "story" && <ExperienceProfile shopSlug={slug} />}

      {/* メニュータブ */}
      {activeContentTab === "menu" && shop.menus.length > 0 && (
        <section className="px-4 py-5">
          <h2 className="text-sm font-bold text-[#2C3E50] mb-3">メニュー一覧</h2>
          <div className="space-y-4">
            {shop.menus.map((menu) => (
              <Card key={menu.id} className="overflow-hidden border-gray-100 shadow-sm">
                {menu.photo_url && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image src={menu.photo_url} alt={menu.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-bold text-[#2C3E50]">{menu.name}</h3>
                    {menu.price && (
                      <span className="shrink-0 text-sm font-semibold text-[#E06A4E]">
                        ¥{menu.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {menu.description && (
                    <p className="mt-1 text-xs text-gray-500">{menu.description}</p>
                  )}
                  {menu.owner_message && (
                    <div className="mt-3 border-l-2 border-[#E06A4E]/30 pl-3">
                      <p className="text-sm italic leading-relaxed text-[#2C3E50]/80">
                        「{menu.owner_message}」
                      </p>
                      <p className="mt-1 text-right text-xs text-gray-400">— {shop.owner_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
      {activeContentTab === "menu" && shop.menus.length === 0 && (
        <section className="px-4 py-5">
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">メニュー情報は準備中です</p>
          </div>
        </section>
      )}

      {/* 店舗情報（常時表示） */}
      <section className="border-t border-gray-100 px-4 py-5">
        <h2 className="text-sm font-bold text-[#2C3E50] mb-3">📍 店舗情報</h2>
        <div className="space-y-3">
          {/* 価格帯 */}
          {(() => {
            const budgetId = shop.basic_info?.budget_label_dinner ?? shop.basic_info?.budget_label_lunch;
            const budget = budgetId ? BUDGET_LABELS.find((b) => b.id === budgetId) : null;
            return budget ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">💰</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 border border-amber-100">
                  {budget.label}
                  <span className="text-xs text-amber-500">({budget.range})</span>
                </span>
              </div>
            ) : null;
          })()}

          {/* 最寄り駅 */}
          {(() => {
            const ns = (shop as Record<string, unknown>).nearest_stations;
            if (!Array.isArray(ns) || ns.length === 0) return null;
            const stationList = ns as Array<{ name: string; line: string; walking_minutes: number }>;
            return (
              <div className="flex items-start gap-3">
                <Train className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="space-y-0.5">
                  {stationList.map((station, i) => (
                    <p key={i} className="text-sm text-gray-700">
                      {station.name}駅
                      <span className="text-xs text-gray-400 ml-1">({station.line})</span>
                      <span className="text-xs text-gray-500 ml-1">徒歩{station.walking_minutes}分</span>
                    </p>
                  ))}
                </div>
              </div>
            );
          })()}

          {shop.address && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-sm text-gray-700">{shop.address}</p>
            </div>
          )}

          {/* 住所下にマップ表示 */}
          {shop.basic_info?.latitude != null && shop.basic_info?.longitude != null ? (
            <div className="mt-1">
              <ShopMap
                latitude={shop.basic_info.latitude}
                longitude={shop.basic_info.longitude}
                shopName={shop.name}
                height="180px"
              />
            </div>
          ) : null}

          {hoursDisplay != null && hoursDisplay !== "" ? (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm text-gray-700">{hoursDisplay}</p>
                {typeof shop.holidays === "string" && shop.holidays ? (
                  <p className="text-xs text-gray-400">定休日: {shop.holidays}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {typeof shop.phone === "string" && shop.phone ? (
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <a href={`tel:${shop.phone}`} className="text-sm text-gray-700 hover:text-[#E06A4E]">
                {shop.phone}
              </a>
            </div>
          ) : null}

          {/* 店舗詳細情報 */}
          {(() => {
            const s = shop as Record<string, unknown>;
            const budgetLunch = s.budget_lunch as string | null;
            const budgetDinner = s.budget_dinner as string | null;
            const paymentMethods = Array.isArray(s.payment_methods) ? s.payment_methods as string[] : [];
            const serviceCharge = s.service_charge as string | null;
            const totalSeats = s.total_seats as number | null;
            const privateRooms = s.private_rooms as string | null;
            const rentalAvailable = s.rental_available as boolean | null;
            const smokingPolicy = s.smoking_policy as string | null;
            const parkingInfo = s.parking as string | null;
            const openingDate = s.opening_date as string | null;
            const hasDetail = budgetLunch || budgetDinner || paymentMethods.length > 0 || serviceCharge || totalSeats || privateRooms || smokingPolicy || parkingInfo || openingDate;
            if (!hasDetail) return null;
            const smokingLabel = smokingPolicy ? SMOKING_POLICIES.find(p => p.value === smokingPolicy)?.label || smokingPolicy : null;
            const privateLabel = privateRooms ? PRIVATE_ROOM_OPTIONS.find(p => p.value === privateRooms)?.label || privateRooms : null;
            return (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-1.5">
                {(budgetLunch || budgetDinner) && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">予算</span>
                    <span>
                      {budgetLunch && `ランチ ${budgetLunch}`}
                      {budgetLunch && budgetDinner && " / "}
                      {budgetDinner && `ディナー ${budgetDinner}`}
                    </span>
                  </div>
                )}
                {paymentMethods.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">支払い</span>
                    <span>{paymentMethods.join("・")}</span>
                  </div>
                )}
                {serviceCharge && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">サービス料</span>
                    <span>{serviceCharge}</span>
                  </div>
                )}
                {totalSeats && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">席数</span>
                    <span>{totalSeats}席</span>
                  </div>
                )}
                {privateLabel && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">個室</span>
                    <span>{privateLabel}</span>
                  </div>
                )}
                {rentalAvailable && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">貸切</span>
                    <span>対応可</span>
                  </div>
                )}
                {smokingLabel && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">喫煙</span>
                    <span>{smokingLabel}</span>
                  </div>
                )}
                {parkingInfo && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">駐車場</span>
                    <span>{parkingInfo}</span>
                  </div>
                )}
                {openingDate && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 w-16 shrink-0">開業</span>
                    <span>{openingDate}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SNS・ウェブサイトリンク */}
          {(() => {
            const websiteUrl = shop.website_url;
            const instagramUrl = typeof (shop as Record<string, unknown>).instagram_url === "string" ? (shop as Record<string, unknown>).instagram_url as string : null;
            const tabelogUrl = shop.tabelog_url;
            const gmbUrl = shop.gmb_url;
            if (!websiteUrl && !instagramUrl && !tabelogUrl && !gmbUrl) return null;
            return (
              <div className="mt-2 flex flex-wrap gap-2">
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    ホームページ
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
                {instagramUrl ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 px-3 py-1 text-xs text-pink-600 hover:from-pink-100 hover:to-purple-100 transition-colors"
                  >
                    📷 Instagram
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
                {tabelogUrl ? (
                  <a
                    href={tabelogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-600 hover:bg-orange-100 transition-colors"
                  >
                    🍽 食べログ
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
                {gmbUrl ? (
                  <a
                    href={gmbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    📍 Googleマップ
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
              </div>
            );
          })()}

          {/* Fan count - qualitative */}
          {fanCount > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <Heart className="h-3 w-3" />
              <span>ファンがいます</span>
            </div>
          )}
        </div>

        {/* 在庫速報 */}
        {supplyFlashPosts.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-600">
              <span className="text-sm">⚡</span>
              在庫速報
            </h3>
            <div className="space-y-2">
              {supplyFlashPosts.slice(0, 3).map((post) => {
                const typeEmoji = { limited: "🔥", seasonal: "🌸", special: "✨", restock: "📦" }[post.supply_type] || "⚡";
                return (
                  <div key={post.id} className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 to-orange-50/40 p-3">
                    <div className="flex items-start gap-2">
                      {post.image_url && (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                          <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{typeEmoji}</span>
                          <p className="text-sm font-bold text-[#2C3E50] truncate">{post.title}</p>
                        </div>
                        {post.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{post.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                          {post.remaining_count != null && (
                            <span className="font-medium text-amber-600">残り{post.remaining_count}</span>
                          )}
                          {post.expires_at && (
                            <span>
                              {new Date(post.expires_at) > new Date()
                                ? `${Math.ceil((new Date(post.expires_at).getTime() - Date.now()) / (60 * 60 * 1000))}時間以内`
                                : "終了"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 近況更新 */}
        {shopUpdates.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Megaphone className="h-3.5 w-3.5" />
              店主の近況
            </h3>
            <div className="space-y-2">
              {shopUpdates.slice(0, 2).map(update => (
                <div key={update.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{update.content}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(update.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 予約打診（インライン: 送信済み or フォーム展開時のみ表示） */}
      {(reservationSent || showReservationForm) && (
        <section className="border-t border-gray-100 px-4 py-5">
          {reservationSent ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <Check className="mx-auto h-6 w-6 text-green-600" />
              <p className="mt-2 text-sm font-medium text-green-800">予約打診を送信しました</p>
              <p className="mt-1 text-xs text-green-600">店主からの返答をお待ちください</p>
            </div>
          ) : (
            <Card className="border-gray-100">
              <CardContent className="space-y-3 p-4">
                <h3 className="flex items-center gap-2 text-sm font-medium text-[#2C3E50]">
                  <CalendarClock className="h-4 w-4 text-[#E06A4E]" />
                  予約を打診する
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">希望日</label>
                    <Input type="date" value={reservationDate} onChange={e => setReservationDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">希望時間</label>
                    <Input type="text" placeholder="19:00" value={reservationTime} onChange={e => setReservationTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">人数</label>
                  <select value={reservationPartySize} onChange={e => setReservationPartySize(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}名</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">メッセージ（任意）</label>
                  <Textarea placeholder="アレルギーやご要望があればお気軽にどうぞ" value={reservationMessage} onChange={e => setReservationMessage(e.target.value)} className="h-16" maxLength={500} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleReservationSubmit} disabled={!reservationDate || !reservationTime || reservationSubmitting} className="gap-1 bg-[#E06A4E] hover:bg-[#d0593d]">
                    <Send className="h-3 w-3" />
                    打診を送信
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReservationForm(false)}>キャンセル</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ファンの声 - qualitative social proof */}
      {fans.length > 0 && fans.some(f => f.push_reason) && (
        <section className="border-t border-gray-100 px-4 py-5">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-[#2C3E50]">ファンの声</h2>
            <span className="text-xs text-muted-foreground">
              ({fanCount <= 3 ? "密かに注目" : fanCount <= 10 ? "じわじわ人気" : fanCount <= 30 ? "注目のお店" : "大人気"})
            </span>
          </div>
          {displayTags.length > 0 && (
            <p className="text-xs text-gray-500 mb-3">
              {displayTags[0].icon} {displayTags[0].label}に共感した人たちに推されています
            </p>
          )}
          <div className="space-y-2.5">
            {fans.filter(f => f.push_reason).slice(0, 4).map(fan => (
              <div key={fan.id} className="rounded-xl border border-orange-100/60 bg-gradient-to-r from-orange-50/50 to-amber-50/30 p-3.5">
                <p className="text-sm leading-relaxed text-[#2C3E50]/85">
                  &ldquo;{fan.push_reason}&rdquo;
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {fan.nickname}さん
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 推しチップ: v6.1で課金機能を完全削除 */}

      {/* 来店記録ボタン（推し店のみ表示） */}
      {isOshi && (
        <section className="border-t border-gray-100 px-4 py-4">
          <Button
            className="w-full gap-2 rounded-xl border-orange-200 text-[#E06A4E] hover:bg-orange-50"
            variant="outline"
            asChild
          >
            <Link href={`/diary/new?shopId=${shop.id}`}>
              <BookOpen className="h-4 w-4" />
              来店記録をつける
            </Link>
          </Button>
        </section>
      )}

      {/* ファンクラブ */}
      {fanClubPlan && (
        <section className="border-t border-gray-100 px-4 py-5">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-[#2C3E50]">💎 ファンクラブ</h2>
            {POC_FREE_MODE && (
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[10px] font-bold text-white">
                プレオープン無料
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {POC_FREE_MODE
              ? "今なら無料でファンクラブに参加できます。推し登録するだけ！"
              : "月額で店主を推そう。ファンクラブ限定の特典が届く"}
          </p>
          <Card className="border-orange-100 bg-gradient-to-r from-orange-50/30 to-amber-50/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-[#2C3E50]">{fanClubPlan.plan_name}</p>
                  {fanClubPlan.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{fanClubPlan.description}</p>
                  )}
                </div>
                {POC_FREE_MODE ? (
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">無料</p>
                    <p className="text-[10px] text-gray-400 line-through">¥{fanClubPlan.price.toLocaleString()}/月</p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-[#E06A4E]">¥{fanClubPlan.price.toLocaleString()}<span className="text-xs font-normal text-gray-400">/月</span></p>
                )}
              </div>
              {Array.isArray(fanClubPlan.benefits) && fanClubPlan.benefits.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(fanClubPlan.benefits as string[]).map((benefit, i) => {
                    // PoC無料モードでは有料機能に「Coming Soon」表示
                    const paidOnlyBenefits = ["予約優先権", "限定イベント参加", "店主との交流会", "記念日サプライズ", "特別体験への招待", "オリジナルグッズ"];
                    const isPaidOnly = POC_FREE_MODE && paidOnlyBenefits.includes(benefit);
                    return (
                      <span key={i} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${isPaidOnly ? "bg-gray-100 text-gray-400" : "bg-orange-50 text-[#E06A4E]"}`}>
                        {isPaidOnly ? "🔒 " : "✓ "}{benefit}
                        {isPaidOnly && <span className="ml-1 text-[9px]">(Coming Soon)</span>}
                      </span>
                    );
                  })}
                </div>
              )}
              {POC_FREE_MODE ? (
                <Button
                  className="w-full mt-3"
                  size="sm"
                  variant={isOshi ? "outline" : "default"}
                  onClick={() => {
                    if (!isAuthenticated) { router.push(`/login?next=/shops/${slug}`); return; }
                    if (isOshi) {
                      // 既に参加中 → 解除
                      trackFanClubLeave({ shopId: shop?.id ?? "", shopSlug: slug });
                    } else {
                      // 参加 = 推し登録
                      trackFanClubJoin({ shopId: shop?.id ?? "", shopSlug: slug, isFreeMode: true });
                    }
                    // 推し登録トグル（既存の仕組みを利用）
                    handleOshiToggle();
                  }}
                >
                  {isOshi ? "✓ ファンクラブ参加中" : "無料で参加する"}
                </Button>
              ) : (
                <Button disabled className="w-full mt-3 opacity-60" size="sm" variant="outline">
                  近日公開
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* 共感タップはストーリー内にインライン配置済み（C-13） */}

      {/* フローティング予約打診CTA - 未送信 & フォーム非展開 & ストーリーモーダル非表示時 */}
      {!reservationSent && !showReservationForm && !showStoryModal && (
        <div className="fixed bottom-16 left-0 right-0 z-40 mx-auto max-w-3xl px-4 md:bottom-6">
          <div className="rounded-2xl bg-white/95 backdrop-blur shadow-lg px-4 py-3">
            <button
              onClick={() => {
                if (!isAuthenticated) { router.push(`/login?next=/shops/${slug}`); return; }
                setShowReservationForm(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E06A4E] py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.97] hover:bg-[#d0593d]"
            >
              <CalendarClock className="h-4 w-4" />
              予約を打診する
            </button>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              まだ予約確定ではありません。空き状況の確認から始まります
            </p>
          </div>
        </div>
      )}

      {/* フローティング推しCTA - ストーリー展開時のみ表示 */}
      {showStoryModal && !isOshi && (
        <div className="fixed bottom-20 left-0 right-0 z-50 mx-auto max-w-3xl px-4 animate-in slide-in-from-bottom-4 duration-300 md:bottom-6">
          <button
            onClick={handleOshiToggle}
            disabled={isTogglingOshi}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E06A4E] py-3.5 text-sm font-medium text-white shadow-lg shadow-[#E06A4E]/30 transition-all active:scale-[0.97] hover:bg-[#d0593d]"
          >
            <Heart className="h-4 w-4" />
            この店主を推す
          </button>
        </div>
      )}

      {/* QRチェックイン同時フロー */}
      {showCheckinFlow && shop && (
        <CheckinOshiFlow
          shopId={shop.id}
          shopName={shop.name}
          shopSlug={shop.slug}
          isAlreadyOshi={isOshi}
          onClose={() => setShowCheckinFlow(false)}
          onComplete={({ oshiRegistered }) => {
            if (oshiRegistered) {
              setIsOshi(true);
              setOshiCount((c) => c + 1);
            }
          }}
        />
      )}
    </div>
  );
}
