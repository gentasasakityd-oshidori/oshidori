"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ListChecks,
  Store,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
  UserPlus,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PHASE_METADATA,
  ONBOARDING_PHASES,
  type OnboardingPhase,
} from "@/lib/onboarding";

type ShopOnboarding = {
  id: string;
  slug: string;
  name: string;
  owner_name: string;
  category: string;
  area: string;
  onboarding_phase: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  latestResearch: { research_status: string; completed_at: string | null } | null;
  latestDesignDoc: { status: string; created_at: string } | null;
  assignment: { interviewer_id: string; status: string; scheduled_date: string | null } | null;
  needsAction: boolean;
};

type ApiResponse = {
  shops: ShopOnboarding[];
  phaseSummary: Record<string, number>;
  totalShops: number;
  actionNeededCount: number;
};

const FILTER_TABS = [
  { key: "all", label: "全件" },
  { key: "action_needed", label: "要対応" },
  { key: "in_progress", label: "進行中" },
  { key: "completed", label: "完了" },
];

export default function AdminOnboardingPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/onboarding${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to fetch onboarding data");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (shopId: string, action: string, extraData?: Record<string, unknown>) => {
    setActionLoading(shopId);
    try {
      await fetch(`/api/admin/onboarding/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData }),
      });
      await fetchData();
    } catch {
      console.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const getPhaseInfo = (phase: string) => {
    return PHASE_METADATA[phase as OnboardingPhase] ?? {
      label: phase,
      shortLabel: phase,
      color: "bg-gray-100",
      textColor: "text-gray-700",
    };
  };

  const getPhaseProgress = (phase: string) => {
    const idx = ONBOARDING_PHASES.indexOf(phase as OnboardingPhase);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / ONBOARDING_PHASES.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">オンボーディング管理</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          更新
        </Button>
      </div>

      {/* サマリーカード */}
      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold">{data.totalShops}</p>
                  <p className="text-xs text-muted-foreground">全店舗</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{data.actionNeededCount}</p>
                  <p className="text-xs text-muted-foreground">要対応</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.totalShops - data.actionNeededCount - (data.phaseSummary["published"] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">進行中</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {data.phaseSummary["published"] || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">公開済み</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* フェーズ別サマリー */}
      {data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              フェーズ別状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_PHASES.map((phase) => {
                const count = data.phaseSummary[phase] || 0;
                if (count === 0) return null;
                const info = getPhaseInfo(phase);
                return (
                  <Badge
                    key={phase}
                    variant="outline"
                    className={`${info.color} ${info.textColor} border-0`}
                  >
                    {info.shortLabel}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルタータブ */}
      <div className="flex gap-2 border-b">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 店舗一覧 */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !data?.shops.length ? (
        <div className="py-12 text-center text-muted-foreground">
          該当する店舗はありません
        </div>
      ) : (
        <div className="space-y-3">
          {data.shops.map((shop) => {
            const phaseInfo = getPhaseInfo(shop.onboarding_phase);
            const progress = getPhaseProgress(shop.onboarding_phase);

            return (
              <Card key={shop.id} className={shop.needsAction ? "border-yellow-300" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* 店舗情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{shop.name}</h3>
                        <Badge
                          variant="outline"
                          className={`${phaseInfo.color} ${phaseInfo.textColor} border-0 shrink-0`}
                        >
                          {phaseInfo.shortLabel}
                        </Badge>
                        {shop.needsAction && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 shrink-0">
                            要対応
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{shop.owner_name}</span>
                        <span>·</span>
                        <span>{shop.area}</span>
                        <span>·</span>
                        <span>{shop.category}</span>
                        <span>·</span>
                        <span>{new Date(shop.created_at).toLocaleDateString("ja-JP")}</span>
                      </div>
                      {/* 進捗バー */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center gap-2 shrink-0">
                      {shop.onboarding_phase === "application_pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(shop.id, "approve")}
                          disabled={actionLoading === shop.id}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          承認
                        </Button>
                      )}
                      {shop.onboarding_phase === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(shop.id, "retry_pipeline")}
                          disabled={actionLoading === shop.id}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          調査開始
                        </Button>
                      )}
                      {shop.onboarding_phase === "ready_for_interview" && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(shop.id, "assign_interviewer", {
                            interviewer_id: "self", // PoC: 自分自身
                          })}
                          disabled={actionLoading === shop.id}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          割当
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.location.href = `/admin/interviewer/${shop.id}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
