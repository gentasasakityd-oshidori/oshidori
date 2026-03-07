"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Users,
  BookOpen,
  Heart,
  MessageCircle,
  Eye,
  TrendingUp,
  Loader2,
  Award,
  BarChart3,
  Percent,
  Sparkles,
  Mail,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Stats = {
  supply: {
    shops: number;
    published_shops: number;
    stories: number;
    published_stories: number;
    story_publish_rate: number;
    interviews: number;
    completed_interviews: number;
    interview_completion_rate: number;
  };
  demand: {
    users: number;
    oshi_total: number;
    oshi_user_count: number;
    oshi_registration_rate: number;
    empathy_total: number;
    empathy_user_count: number;
  };
  community: {
    message_count: number;
    message_shop_count: number;
    message_delivery_rate: number;
    avg_oshi_per_shop: number;
  };
  top_shops: { id: string; name: string; slug: string; oshi_count: number }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Ignore
      }
      setIsLoading(false);
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-muted-foreground">
        データの読み込みに失敗しました
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">KPIダッシュボード</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          オシドリ事業のリアルタイムKPI
        </p>
      </div>

      {/* ===== KPIアラート ===== */}
      {(() => {
        const alerts: { label: string; current: string; target: string }[] = [];
        if (stats.supply.story_publish_rate < 80) alerts.push({ label: "ストーリー公開率", current: `${stats.supply.story_publish_rate}%`, target: "80%" });
        if (stats.supply.interview_completion_rate < 90) alerts.push({ label: "インタビュー完了率", current: `${stats.supply.interview_completion_rate}%`, target: "90%" });
        if (stats.demand.oshi_registration_rate < 30) alerts.push({ label: "推し登録率", current: `${stats.demand.oshi_registration_rate}%`, target: "30%" });
        if (stats.community.message_delivery_rate < 50) alerts.push({ label: "メッセージ配信率", current: `${stats.community.message_delivery_rate}%`, target: "50%" });
        if (stats.community.avg_oshi_per_shop < 5) alerts.push({ label: "店舗あたりファン数", current: `${stats.community.avg_oshi_per_shop}人`, target: "5人" });
        return alerts.length > 0 ? (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-800">目標未達KPI（{alerts.length}件）</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {alerts.map((a) => (
                  <div key={a.label} className="flex items-center justify-between rounded-md bg-white/60 px-3 py-1.5 text-xs">
                    <span className="text-orange-700">{a.label}</span>
                    <span><span className="font-bold text-orange-800">{a.current}</span> <span className="text-gray-400">/ 目標{a.target}</span></span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-2 p-4">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">全KPIが目標を達成しています</span>
            </CardContent>
          </Card>
        );
      })()}

      {/* ===== 供給サイド（店舗）===== */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Store className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold">供給サイド（店舗）</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="導入店舗数"
            value={stats.supply.shops}
            icon={Store}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <KPICard
            label="公開中店舗"
            value={stats.supply.published_shops}
            icon={Eye}
            color="text-green-600"
            bg="bg-green-50"
            sub={`${stats.supply.shops}店舗中`}
          />
          <KPICard
            label="ストーリー公開率"
            value={`${stats.supply.story_publish_rate}%`}
            icon={Percent}
            color="text-orange-600"
            bg="bg-orange-50"
            sub={`${stats.supply.published_stories}/${stats.supply.stories}件`}
            target="目標: 80%以上"
          />
          <KPICard
            label="インタビュー完了率"
            value={`${stats.supply.interview_completion_rate}%`}
            icon={Sparkles}
            color="text-purple-600"
            bg="bg-purple-50"
            sub={`${stats.supply.completed_interviews}/${stats.supply.interviews}件`}
            target="目標: 90%以上"
          />
        </div>
      </section>

      {/* ===== 需要サイド（消費者）===== */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-bold">需要サイド（消費者）</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="登録ユーザー数"
            value={stats.demand.users}
            icon={Users}
            color="text-purple-600"
            bg="bg-purple-50"
          />
          <KPICard
            label="推し登録率"
            value={`${stats.demand.oshi_registration_rate}%`}
            icon={Heart}
            color="text-red-600"
            bg="bg-red-50"
            sub={`${stats.demand.oshi_user_count}/${stats.demand.users}人`}
            target="目標: 30%以上"
          />
          <KPICard
            label="推し登録総数"
            value={stats.demand.oshi_total}
            icon={Heart}
            color="text-red-500"
            bg="bg-red-50"
          />
          <KPICard
            label="共感タップ総数"
            value={stats.demand.empathy_total}
            icon={MessageCircle}
            color="text-pink-600"
            bg="bg-pink-50"
            sub={`${stats.demand.empathy_user_count}人が参加`}
          />
        </div>
      </section>

      {/* ===== コミュニティ指標 ===== */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-bold">コミュニティ指標</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            label="メッセージ配信率"
            value={`${stats.community.message_delivery_rate}%`}
            icon={Mail}
            color="text-green-600"
            bg="bg-green-50"
            sub={`${stats.community.message_shop_count}/${stats.supply.shops}店舗`}
            target="目標: 50%以上"
          />
          <KPICard
            label="配信メッセージ数"
            value={stats.community.message_count}
            icon={MessageCircle}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <KPICard
            label="1店舗あたり平均ファン数"
            value={stats.community.avg_oshi_per_shop}
            icon={BarChart3}
            color="text-orange-600"
            bg="bg-orange-50"
            target="目標: 5人以上"
          />
        </div>
      </section>

      {/* ===== 応援者数ランキング ===== */}
      {stats.top_shops.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-bold">ファン数ランキング</h2>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {stats.top_shops.map((shop, i) => (
                <div
                  key={shop.id}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : i === 1
                          ? "bg-gray-100 text-gray-600"
                          : i === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{shop.name}</span>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Heart className="h-3 w-3" />
                    {shop.oshi_count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

// --- KPIカードコンポーネント ---
function KPICard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  sub,
  target,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  sub?: string;
  target?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${bg}`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && (
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          )}
          {target && (
            <p className="mt-0.5 text-xs font-medium text-primary">
              {target}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
