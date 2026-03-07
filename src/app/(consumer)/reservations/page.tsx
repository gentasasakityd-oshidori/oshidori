"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  Users,
  Loader2,
  ChevronRight,
  Store,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type ReservationItem = {
  id: string;
  shop_id: string;
  preferred_date: string;
  preferred_time: string;
  party_size: number;
  message: string | null;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  created_at: string;
  shop_name?: string;
  shop_slug?: string;
};

const STATUS_CONFIG = {
  pending: {
    label: "打診中",
    color: "bg-amber-100 text-amber-800",
    icon: Timer,
  },
  confirmed: {
    label: "確定",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
  declined: {
    label: "辞退",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  cancelled: {
    label: "キャンセル",
    color: "bg-gray-100 text-gray-600",
    icon: XCircle,
  },
};

export default function ReservationsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/reservations");
        return;
      }

      try {
        const res = await fetch("/api/reservations");
        if (res.ok) {
          const data = await res.json();
          const items = (data.reservations ?? []) as ReservationItem[];

          // 店舗名を取得
          const shopIds = [...new Set(items.map((r) => r.shop_id))];
          if (shopIds.length > 0) {
            const { data: shops } = await supabase
              .from("shops")
              .select("id, name, slug")
              .in("id", shopIds);

            const shopMap = new Map(
              ((shops ?? []) as { id: string; name: string; slug: string }[]).map(
                (s) => [s.id, s]
              )
            );

            for (const item of items) {
              const shop = shopMap.get(item.shop_id);
              if (shop) {
                item.shop_name = shop.name;
                item.shop_slug = shop.slug;
              }
            }
          }

          setReservations(items);
        }
      } catch {
        // ignore
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

  const activeReservations = reservations.filter(
    (r) => r.status === "pending" || r.status === "confirmed"
  );
  const pastReservations = reservations.filter(
    (r) => r.status === "declined" || r.status === "cancelled"
  );

  return (
    <>
      {/* ヘッダー */}
      <section className="bg-warm px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            予約打診
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            お店への予約リクエストの状況
          </p>
        </div>
      </section>

      <section className="px-4 py-6 pb-24">
        <div className="mx-auto max-w-3xl">
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-primary/20 bg-warm/30 p-8 text-center">
              <CalendarCheck className="mx-auto h-12 w-12 text-primary/30" />
              <p className="mt-4 text-base font-medium text-[#2C3E50]">
                予約打診はまだありません
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                推し店のページから予約を打診できます
              </p>
              <Button asChild className="mt-5 gap-1.5">
                <Link href="/explore">
                  <Store className="h-4 w-4" />
                  お店を探す
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* アクティブな予約 */}
              {activeReservations.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    進行中
                  </h2>
                  {activeReservations.map((r) => {
                    const statusConfig = STATUS_CONFIG[r.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Card key={r.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex items-stretch">
                            {/* ステータスカラーバー */}
                            <div className={`w-1 ${r.status === "pending" ? "bg-amber-400" : "bg-green-500"}`} />

                            <div className="flex-1 p-3">
                              {/* 店舗名 + ステータス */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-primary" />
                                  {r.shop_slug ? (
                                    <Link
                                      href={`/shops/${r.shop_slug}`}
                                      className="text-[15px] font-bold hover:text-primary"
                                    >
                                      {r.shop_name ?? "お店"}
                                    </Link>
                                  ) : (
                                    <span className="text-[15px] font-bold">{r.shop_name ?? "お店"}</span>
                                  )}
                                </div>
                                <Badge className={`text-[10px] ${statusConfig.color} border-0`}>
                                  <StatusIcon className="mr-0.5 h-3 w-3" />
                                  {statusConfig.label}
                                </Badge>
                              </div>

                              {/* 予約詳細 */}
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {r.preferred_date} {r.preferred_time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {r.party_size}名
                                </span>
                              </div>

                              {r.message && (
                                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                  <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{r.message}</span>
                                </div>
                              )}
                            </div>

                            {r.shop_slug && (
                              <Link
                                href={`/shops/${r.shop_slug}`}
                                className="flex items-center px-2 text-gray-300 hover:text-primary"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* 過去の予約 */}
              {pastReservations.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    過去の予約
                  </h2>
                  {pastReservations.map((r) => {
                    const statusConfig = STATUS_CONFIG[r.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Card key={r.id} className="opacity-60">
                        <CardContent className="flex items-center gap-3 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium truncate">
                                {r.shop_name ?? "お店"}
                              </span>
                              <Badge className={`text-[10px] ${statusConfig.color} border-0`}>
                                <StatusIcon className="mr-0.5 h-3 w-3" />
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span>{r.preferred_date}</span>
                              <span>{r.party_size}名</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
