"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, Heart, BookOpen, Loader2, ExternalLink, Activity, RefreshCw, AlertTriangle, Play, ChevronRight, Clock, CheckCircle2, Search, FileText, UserPlus, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PHASE_METADATA, ONBOARDING_PHASES, OWNER_VISIBLE_STEPS, type OnboardingPhase } from "@/lib/onboarding";
import type { Shop } from "@/types/database";

type AdminShop = Shop & {
  story_count: number;
  oshi_count: number;
  stories: { id: string; title: string; status: string }[];
};

/** 店舗ヘルススコア算出 (0-100) */
function calcHealthScore(shop: AdminShop): { score: number; label: string; color: string } {
  let score = 0;
  if (shop.is_published) score += 20;
  const publishedStories = shop.stories.filter(s => s.status === "published").length;
  if (publishedStories >= 1) score += 25;
  score += Math.min(25, Math.floor((shop.oshi_count / 5) * 25));
  score += Math.min(15, Math.floor((shop.story_count / 2) * 15));
  if (shop.name) score += 5;
  if (shop.area) score += 5;
  if (shop.category) score += 5;

  score = Math.min(score, 100);
  const label = score >= 80 ? "良好" : score >= 50 ? "改善余地" : "要対応";
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return { score, label, color };
}

type FilterTab = "all" | "onboarding" | "published" | "error";

export default function AdminShopsPage() {
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ shopId: string; text: string; type: "success" | "error" } | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/shops");
      if (res.ok) {
        const data = await res.json();
        setShops(data.shops);
      }
    } catch {
      // Ignore
    }
    setIsLoading(false);
  }

  async function togglePublish(shopId: string, currentState: boolean) {
    setTogglingId(shopId);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: shopId,
          is_published: !currentState,
        }),
      });
      if (res.ok) {
        setShops((prev) =>
          prev.map((s) =>
            s.id === shopId ? { ...s, is_published: !currentState } : s
          )
        );
      }
    } catch {
      // Ignore
    }
    setTogglingId(null);
  }

  // 汎用オンボーディングアクション実行
  async function handleOnboardingAction(shopId: string, action: string, body?: Record<string, unknown>) {
    setActionLoadingId(shopId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/onboarding/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ shopId, text: data.message || "完了", type: "success" });
        await loadShops();
      } else {
        setActionMessage({ shopId, text: data.error || "エラーが発生しました", type: "error" });
      }
    } catch {
      setActionMessage({ shopId, text: "通信エラー", type: "error" });
    }
    setActionLoadingId(null);
    setTimeout(() => setActionMessage((prev) => prev?.shopId === shopId ? null : prev), 3000);
  }

  // フェーズに応じたクイックアクションボタン定義
  type QuickAction = { label: string; icon: React.ReactNode; action: string; body?: Record<string, unknown>; variant?: "default" | "outline"; className?: string };
  const getQuickActions = (phase: string): QuickAction[] => {
    switch (phase) {
      case "application_pending":
        return [{
          label: "承認",
          icon: <ThumbsUp className="h-3 w-3" />,
          action: "approve",
          variant: "default",
          className: "bg-green-600 hover:bg-green-700",
        }];
      case "approved":
        return [{
          label: "リサーチ開始",
          icon: <Search className="h-3 w-3" />,
          action: "retry_pipeline",
          variant: "default",
          className: "bg-blue-600 hover:bg-blue-700",
        }];
      case "pipeline_error":
        return [{
          label: "再実行",
          icon: <Play className="h-3 w-3" />,
          action: "retry_pipeline",
          variant: "outline",
          className: "text-red-600 border-red-300 hover:bg-red-50",
        }];
      case "pre_research_done":
        return [{
          label: "設計書生成",
          icon: <FileText className="h-3 w-3" />,
          action: "update_phase",
          body: { phase: "design_doc_generating" },
          variant: "default",
          className: "bg-blue-600 hover:bg-blue-700",
        }];
      case "ready_for_interview":
        return [{
          label: "割当",
          icon: <UserPlus className="h-3 w-3" />,
          action: "update_phase",
          body: { phase: "interviewer_assigned" },
          variant: "outline",
        }];
      default:
        return [];
    }
  };

  const getPhaseInfo = (phase: string) => {
    return PHASE_METADATA[phase as OnboardingPhase] ?? {
      label: phase,
      shortLabel: phase,
      color: "bg-gray-100",
      textColor: "text-gray-700",
      description: "",
      actor: "system" as const,
      needsAction: false,
    };
  };

  // フェーズ進捗率（0〜100）
  const getPhaseProgress = (phase: string): number => {
    if (phase === "pipeline_error") return 0;
    const idx = ONBOARDING_PHASES.indexOf(phase as OnboardingPhase);
    if (idx < 0) return 0;
    return Math.round((idx / (ONBOARDING_PHASES.length - 1)) * 100);
  };

  // 現在のステップ番号
  const getCurrentStep = (phase: string): { step: number; total: number; label: string } => {
    const ownerStep = OWNER_VISIBLE_STEPS.find((s) =>
      s.phases.includes(phase as OnboardingPhase)
    );
    return {
      step: ownerStep?.step ?? 0,
      total: OWNER_VISIBLE_STEPS.length,
      label: ownerStep?.label ?? "不明",
    };
  };

  // 次のアクション表示テキスト
  const getNextAction = (phase: string): string | null => {
    const info = getPhaseInfo(phase);
    if (!info.needsAction) return null;
    switch (phase) {
      case "application_pending": return "承認が必要";
      case "ready_for_interview": return "割当が必要";
      case "interviewer_assigned": return "日程調整が必要";
      case "story_review": return "ストーリー確認";
      case "photo_pending": return "写真待ち";
      case "pipeline_error": return "再実行が必要";
      default: return null;
    }
  };

  // フィルタリング
  const filteredShops = shops.filter((shop) => {
    const phase = (shop as AdminShop & { onboarding_phase?: string }).onboarding_phase;
    if (filter === "all") return true;
    if (filter === "published") return shop.is_published;
    if (filter === "error") return phase === "pipeline_error";
    if (filter === "onboarding") return !shop.is_published && phase !== "pipeline_error";
    return true;
  });

  const errorCount = shops.filter((s) => (s as AdminShop & { onboarding_phase?: string }).onboarding_phase === "pipeline_error").length;
  const onboardingCount = shops.filter((s) => !(s as AdminShop & { onboarding_phase?: string }).is_published && (s as AdminShop & { onboarding_phase?: string }).onboarding_phase !== "pipeline_error").length;
  const publishedCount = shops.filter((s) => s.is_published).length;

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">店舗管理</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            申請・オンボーディング・公開状態を一元管理
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs sm:text-sm">
            {shops.length}店舗
          </Badge>
          <Button variant="outline" size="sm" onClick={loadShops} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* フィルタータブ（横スクロール可能） */}
      <div className="mt-3 -mx-1 overflow-x-auto">
        <div className="flex gap-1 border-b px-1 min-w-max">
          {([
            { key: "all" as FilterTab, label: "全件", count: shops.length },
            { key: "onboarding" as FilterTab, label: "進行中", count: onboardingCount },
            { key: "published" as FilterTab, label: "公開", count: publishedCount },
            { key: "error" as FilterTab, label: "エラー", count: errorCount },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {filteredShops.map((shop) => {
            const phase = (shop as AdminShop & { onboarding_phase?: string }).onboarding_phase || "application_pending";
            const phaseInfo = getPhaseInfo(phase);
            const isError = phase === "pipeline_error";
            const isPublished = phase === "published";
            const progress = getPhaseProgress(phase);
            const stepInfo = getCurrentStep(phase);
            const nextAction = getNextAction(phase);
            const quickActions = getQuickActions(phase);

            return (
              <Card key={shop.id} className={isError ? "border-red-300 border-2" : nextAction && !isError ? "border-amber-200" : ""}>
                <CardContent className="p-3 sm:p-4">
                  {/* モバイル: 縦積みレイアウト */}
                  <div className="flex flex-col gap-2">
                    {/* 店舗名 + アクションボタン（横並び） */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/shops/${shop.id}`}
                          className="font-semibold text-sm sm:text-base hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate">{shop.name}</span>
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {shop.owner_name} / {shop.area} / {shop.category}
                        </p>
                      </div>

                      {/* クイックアクションボタン */}
                      <div className="flex items-center gap-1 shrink-0">
                        {quickActions.map((qa, idx) => (
                          <Button
                            key={idx}
                            variant={qa.variant === "default" ? "default" : "outline"}
                            size="sm"
                            className={`gap-1 text-[11px] h-7 px-2 ${qa.className || ""}`}
                            onClick={() => handleOnboardingAction(shop.id, qa.action, qa.body)}
                            disabled={actionLoadingId === shop.id}
                          >
                            {actionLoadingId === shop.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              qa.icon
                            )}
                            <span className="hidden xs:inline">{qa.label}</span>
                          </Button>
                        ))}
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/shops/${shop.slug}`} target="_blank">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-[11px] h-7 px-2"
                          onClick={() => togglePublish(shop.id, shop.is_published)}
                          disabled={togglingId === shop.id}
                        >
                          {togglingId === shop.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : shop.is_published ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* フィードバックメッセージ */}
                    {actionMessage?.shopId === shop.id && (
                      <span className={`text-[10px] font-medium ${
                        actionMessage.type === "success" ? "text-green-600" : "text-red-600"
                      }`}>
                        {actionMessage.text}
                      </span>
                    )}

                    {/* ステータスエリア（コンパクト） */}
                    <div className="rounded-lg border bg-gray-50/80 p-2 sm:p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isPublished ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          ) : isError ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          )}
                          <span className="text-xs sm:text-sm font-semibold truncate">
                            {phaseInfo.label}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] sm:text-[10px] border-0 px-1 py-0 shrink-0 ${phaseInfo.color} ${phaseInfo.textColor}`}
                          >
                            {stepInfo.step}/{stepInfo.total}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                          {progress}%
                        </span>
                      </div>

                      {/* プログレスバー */}
                      {!isPublished && (
                        <div className="mt-1.5 h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isError ? "bg-red-400" : "bg-primary"
                            }`}
                            style={{ width: `${Math.max(progress, 5)}%` }}
                          />
                        </div>
                      )}

                      {/* 次のアクション */}
                      {nextAction && (
                        <div className={`mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-medium ${
                          isError ? "text-red-600" : "text-amber-700"
                        }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                            isError ? "bg-red-500 animate-pulse" : "bg-amber-500"
                          }`} />
                          {nextAction}
                        </div>
                      )}

                      {/* AI処理中の表示 */}
                      {(phase === "pre_research_running" || phase === "design_doc_generating" || phase === "story_generating") && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          AI処理中...
                        </div>
                      )}

                      {/* パイプラインエラー詳細 */}
                      {isError && (() => {
                        const meta = (shop as AdminShop & { metadata?: { pipeline_error?: { message?: string; occurred_at?: string } } }).metadata;
                        const errInfo = meta?.pipeline_error;
                        if (!errInfo?.message) return null;
                        return (
                          <div className="mt-1.5 rounded bg-red-50 px-2 py-1 text-[10px] text-red-700">
                            <p className="font-medium">エラー:</p>
                            <p className="mt-0.5 break-all line-clamp-2">{errInfo.message}</p>
                            {errInfo.occurred_at && (
                              <p className="mt-0.5 text-red-400">{new Date(errInfo.occurred_at).toLocaleString("ja-JP")}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 統計情報（コンパクト） */}
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <BookOpen className="h-3 w-3" />
                        {shop.story_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" />
                        {shop.oshi_count}
                      </span>
                      {(() => {
                        const health = calcHealthScore(shop);
                        return (
                          <span className={`flex items-center gap-0.5 font-medium ${health.color}`}>
                            <Activity className="h-3 w-3" />
                            {health.score}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredShops.length === 0 && (
            <p className="py-8 text-center text-muted-foreground text-sm">
              該当する店舗はありません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
