"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Mail,
  MessageCircle,
  CalendarClock,
  ChevronRight,
  Crown,
  Gift,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export default function InteractionPage() {
  const [fanCount, setFanCount] = useState<number | null>(null);
  const [unreadLetters, setUnreadLetters] = useState<number>(0);
  const [pendingReservations, setPendingReservations] = useState<number>(0);

  useEffect(() => {
    async function loadCounts() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 店舗ID取得
        const { data: shops } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1);
        if (!shops || shops.length === 0) return;
        const shopId = (shops[0] as { id: string }).id;

        // ファン数
        const { count: oshiCount } = await supabase
          .from("oshi_shops")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId);
        setFanCount(oshiCount ?? 0);

        // 未読ファンレター
        const { count: letterCount } = await supabase
          .from("fan_letters")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId)
          .eq("is_read", false);
        setUnreadLetters(letterCount ?? 0);

        // 未処理予約打診
        const { count: resCount } = await supabase
          .from("reservation_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId)
          .eq("status", "pending");
        setPendingReservations(resCount ?? 0);
      } catch {
        // ignore
      }
    }
    loadCounts();
  }, []);

  const INTERACTION_SECTIONS = [
    {
      id: "fans",
      label: "会員管理",
      description: "推し登録してくれたファンクラブ会員の一覧・分析",
      icon: Users,
      href: "/dashboard/fans",
      emoji: "👥",
      badge: fanCount !== null ? `${fanCount}人` : undefined,
    },
    {
      id: "fan-letters",
      label: "ファンレター",
      description: "お客さんからの応援メッセージを確認・返信",
      icon: Mail,
      href: "/dashboard/fan-letters",
      emoji: "📬",
      badge: unreadLetters > 0 ? `${unreadLetters}件未読` : undefined,
      badgeVariant: unreadLetters > 0 ? "destructive" as const : undefined,
    },
    {
      id: "messages",
      label: "メッセージ配信",
      description: "ファンへのお知らせや感謝を一斉・個別に配信",
      icon: MessageCircle,
      href: "/dashboard/messages",
      emoji: "📨",
    },
    {
      id: "benefits",
      label: "特典提供",
      description: "会員特典の設定・提供履歴の管理",
      icon: Gift,
      href: "/dashboard/fan-club",
      emoji: "🎁",
    },
    {
      id: "reservations",
      label: "予約管理",
      description: "お客さんからの予約リクエストの受付・管理",
      icon: CalendarClock,
      href: "/dashboard/reservations",
      emoji: "📅",
      badge: pendingReservations > 0 ? `${pendingReservations}件` : undefined,
      badgeVariant: pendingReservations > 0 ? "destructive" as const : undefined,
    },
    {
      id: "fan-club-settings",
      label: "ファンクラブ設計",
      description: "プラン設定・加入条件・AI推奨アドバイス",
      icon: Crown,
      href: "/dashboard/fan-club",
      emoji: "👑",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          ファンクラブ運営
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          会員管理・特典提供・コミュニケーションをまとめて運営
        </p>
      </div>

      {/* ファンクラブ概要カード */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">ファンクラブ会員</p>
                <p className="text-2xl font-bold text-primary">
                  {fanCount !== null ? fanCount : "—"}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">人</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">未読レター</p>
              <p className="text-lg font-bold text-amber-600">{unreadLetters}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {INTERACTION_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="group block"
          >
            <Card className="transition-all hover:shadow-md hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                    {section.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#2C3E50] group-hover:text-primary transition-colors">
                        {section.label}
                      </h3>
                      {section.badge && (
                        <Badge
                          variant={section.badgeVariant ?? "secondary"}
                          className="text-[10px]"
                        >
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
