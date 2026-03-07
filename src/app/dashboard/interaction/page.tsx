"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Mail,
  MessageCircle,
  CalendarClock,
  ChevronRight,
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
      label: "ファン一覧",
      description: "推し登録してくれたお客さんの一覧",
      icon: Users,
      href: "/dashboard/fans",
      emoji: "👥",
      badge: fanCount !== null ? `${fanCount}人` : undefined,
    },
    {
      id: "fan-letters",
      label: "ファンレター",
      description: "お客さんからの応援メッセージ",
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
      id: "reservations",
      label: "予約打診",
      description: "お客さんからの予約リクエストの管理",
      icon: CalendarClock,
      href: "/dashboard/reservations",
      emoji: "📅",
      badge: pendingReservations > 0 ? `${pendingReservations}件` : undefined,
      badgeVariant: pendingReservations > 0 ? "destructive" as const : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          💬 お客さんとの交流
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ファンとのコミュニケーションをまとめて管理
        </p>
      </div>

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
