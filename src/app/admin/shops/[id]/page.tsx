"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  BookOpen,
  Mail,
  Sparkles,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  Search,
  FileText,
  ClipboardCheck,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  PHASE_METADATA,
  ONBOARDING_PHASES,
  OWNER_VISIBLE_STEPS,
  type OnboardingPhase,
} from "@/lib/onboarding";

type ShopDetail = {
  shop: {
    id: string;
    name: string;
    slug: string;
    owner_name: string;
    area: string;
    category: string;
    is_published: boolean;
    created_at: string;
    onboarding_phase: string;
    owner_id: string;
    metadata?: Record<string, unknown>;
  };
  stories: { id: string; title: string; status: string; created_at: string }[];
  menus: { id: string; name: string; price: number; is_signature: boolean }[];
  oshi_count: number;
  oshi_fans: { user_id: string; created_at: string }[];
  empathy_total: number;
  empathy_tag_distribution: { tag: string; count: number }[];
  interviews: {
    id: string;
    status: string;
    current_phase: number;
    created_at: string;
    updated_at: string;
  }[];
  message_count: number;
  application?: {
    id: string;
    status: string;
    applicant_name: string;
    shop_name: string;
    shop_genre: string | null;
    message: string | null;
    review_note: string | null;
    created_at: string;
    reviewed_at: string | null;
  } | null;
};

// オンボーディング詳細データ
type OnboardingDetail = {
  shop: Record<string, unknown>;
  researchReports: {
    id: string;
    research_status: string;
    created_at: string;
    completed_at: string | null;
    summary?: string;
    web_sources?: unknown[];
    research_data?: Record<string, unknown>;
  }[];
  designDocs: {
    id: string;
    status: string;
    created_at: string;
    questions?: unknown[];
    interview_plan?: Record<string, unknown>;
  }[];
  interviews: {
    id: string;
    status: string;
    current_phase: number;
    created_at: string;
    updated_at: string;
  }[];
  stories: { id: string; title: string; created_at: string }[];
  assignments: {
    id: string;
    interviewer_id: string;
    status: string;
    scheduled_date: string | null;
    users?: { nickname: string; avatar_url: string | null };
  }[];
};

type TabKey = "info" | "application" | "onboarding";

export default function AdminShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ShopDetail | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/shops/${id}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Ignore
    }
    setIsLoading(false);
  }, [id]);

  const loadOnboarding = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/onboarding/${id}`);
      if (res.ok) {
        setOnboardingData(await res.json());
      }
    } catch {
      // Ignore
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // オンボーディングタブ表示時にデータ取得
  useEffect(() => {
    if (activeTab === "onboarding") {
      loadOnboarding();
    }
  }, [activeTab, loadOnboarding]);

  const handleOnboardingAction = async (action: string, extraData?: Record<string, unknown>) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/onboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData }),
      });
      const result = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: result.message || "処理が完了しました" });
      } else {
        setActionMessage({ type: "error", text: result.error || "エラーが発生しました" });
      }
      await load();
      await loadOnboarding();
    } catch {
      setActionMessage({ type: "error", text: "通信エラーが発生しました" });
    }
    setActionLoading(false);
  };

  // 申請の承認/却下
  const handleApplicationAction = async (appAction: "approved" | "rejected") => {
    if (!data?.application?.id) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: data.application.id,
          action: appAction,
          review_note: reviewNote || null,
        }),
      });
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: appAction === "approved" ? "承認しました。事前調査を自動開始します" : "却下しました",
        });
        setReviewNote("");
      } else {
        setActionMessage({ type: "error", text: "処理に失敗しました" });
      }
      await load();
    } catch {
      setActionMessage({ type: "error", text: "通信エラーが発生しました" });
    }
    setActionLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground">
        店舗が見つかりません
      </div>
    );
  }

  const { shop, stories, menus, oshi_count, empathy_total, empathy_tag_distribution, interviews, message_count } = data;
  const phase = shop.onboarding_phase || "application_pending";
  const phaseInfo = PHASE_METADATA[phase as OnboardingPhase] ?? {
    label: phase,
    shortLabel: phase,
    color: "bg-gray-100",
    textColor: "text-gray-700",
    description: "",
    actor: "system" as const,
    needsAction: false,
  };
  const phaseIdx = ONBOARDING_PHASES.indexOf(phase as OnboardingPhase);
  const phaseProgress = phaseIdx < 0 ? 0 : Math.round(((phaseIdx + 1) / ONBOARDING_PHASES.length) * 100);

  // 現在のステップ情報
  const currentStep = OWNER_VISIBLE_STEPS.find((s) =>
    s.phases.includes(phase as OnboardingPhase)
  );

  const TABS: { key: TabKey; label: string; badge?: string }[] = [
    { key: "info", label: "基本情報" },
    { key: "application", label: "申請管理" },
    { key: "onboarding", label: "オンボーディング", badge: phaseInfo.needsAction ? "要対応" : undefined },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link href="/admin/shops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            <Badge variant={shop.is_published ? "default" : "secondary"}>
              {shop.is_published ? (
                <><Eye className="mr-1 h-3 w-3" />公開中</>
              ) : (
                <><EyeOff className="mr-1 h-3 w-3" />非公開</>
              )}
            </Badge>
            <Badge
              variant="outline"
              className={`border-0 ${phaseInfo.color} ${phaseInfo.textColor}`}
            >
              {phaseInfo.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {shop.owner_name} / {shop.area} / {shop.category}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            登録日: {new Date(shop.created_at).toLocaleDateString("ja-JP")}
            {currentStep && (
              <span className="ml-3">
                ステップ {currentStep.step}/{OWNER_VISIBLE_STEPS.length}: {currentStep.label}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shops/${shop.slug}`} target="_blank">
            <ExternalLink className="mr-1 h-3 w-3" />
            店舗ページ
          </Link>
        </Button>
      </div>

      {/* アクション結果メッセージ */}
      {actionMessage && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
          actionMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {actionMessage.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {actionMessage.text}
          <button onClick={() => setActionMessage(null)} className="ml-auto text-xs underline">閉じる</button>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-medium">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 基本情報タブ */}
      {activeTab === "info" && (
        <>
          {/* KPIサマリ */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniCard icon={Heart} label="ファン数" value={oshi_count} color="text-red-600" bg="bg-red-50" />
            <MiniCard icon={MessageCircle} label="共感タップ数" value={empathy_total} color="text-pink-600" bg="bg-pink-50" />
            <MiniCard icon={BookOpen} label="ストーリー数" value={stories.length} color="text-orange-600" bg="bg-orange-50" />
            <MiniCard icon={Mail} label="メッセージ配信数" value={message_count} color="text-blue-600" bg="bg-blue-50" />
          </div>

          {/* 共感タグ分布 */}
          {empathy_tag_distribution.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">共感タグ分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {empathy_tag_distribution.map((item) => {
                    const maxCount = empathy_tag_distribution[0].count;
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={item.tag} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-sm">{item.tag}</span>
                        <div className="flex-1">
                          <div className="h-5 rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="w-8 text-right text-sm font-medium">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ストーリー一覧 */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">ストーリー一覧</CardTitle></CardHeader>
            <CardContent className="divide-y p-0">
              {stories.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">ストーリーはまだありません</p>
              ) : (
                stories.map((story) => (
                  <div key={story.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium">{story.title}</h4>
                      <p className="text-xs text-muted-foreground">{new Date(story.created_at).toLocaleDateString("ja-JP")}</p>
                    </div>
                    <Badge variant={story.status === "published" ? "default" : "secondary"} className="text-xs">
                      {story.status === "published" ? "公開中" : "下書き"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* メニュー一覧 */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">メニュー</CardTitle></CardHeader>
            <CardContent className="divide-y p-0">
              {menus.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">メニューはまだありません</p>
              ) : (
                menus.map((menu) => (
                  <div key={menu.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1"><h4 className="font-medium">{menu.name}</h4></div>
                    {menu.is_signature && <Badge variant="outline" className="text-xs">看板メニュー</Badge>}
                    <span className="text-sm text-muted-foreground">
                      {menu.price > 0 ? `¥${menu.price.toLocaleString()}` : "—"}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* インタビュー履歴 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />AIインタビュー履歴
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {interviews.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">インタビュー記録はありません</p>
              ) : (
                interviews.map((iv) => (
                  <div key={iv.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{new Date(iv.created_at).toLocaleDateString("ja-JP")} 開始</p>
                      <p className="text-xs text-muted-foreground">フェーズ {iv.current_phase}/6</p>
                    </div>
                    <Badge variant={iv.status === "completed" ? "default" : "secondary"} className="text-xs">
                      {iv.status === "completed" ? "完了" : iv.status === "in_progress" ? "進行中" : iv.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 申請管理タブ */}
      {activeTab === "application" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">店舗権限申請</CardTitle>
          </CardHeader>
          <CardContent>
            {data.application ? (
              <div className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">申請者:</span> {data.application.applicant_name}</div>
                  <div>
                    <span className="text-muted-foreground">ステータス:</span>{" "}
                    <Badge variant={data.application.status === "approved" ? "default" : data.application.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {data.application.status === "approved" ? "承認済み" : data.application.status === "rejected" ? "却下" : "審査中"}
                    </Badge>
                  </div>
                  <div><span className="text-muted-foreground">申請日:</span> {new Date(data.application.created_at).toLocaleDateString("ja-JP")}</div>
                  {data.application.reviewed_at && (
                    <div><span className="text-muted-foreground">審査日:</span> {new Date(data.application.reviewed_at).toLocaleDateString("ja-JP")}</div>
                  )}
                </div>
                {data.application.message && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm">
                    <p className="text-muted-foreground">メッセージ:</p>
                    <p className="mt-1">{data.application.message}</p>
                  </div>
                )}
                {data.application.review_note && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm">
                    <p className="text-muted-foreground">審査メモ:</p>
                    <p className="mt-1">{data.application.review_note}</p>
                  </div>
                )}
                {data.application.status === "pending" && (
                  <div className="space-y-3 border-t pt-3">
                    <Textarea
                      placeholder="審査メモ（任意）"
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleApplicationAction("approved")}
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                        承認（事前調査を自動開始）
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => handleApplicationAction("rejected")}
                      >
                        <XCircle className="mr-1 h-4 w-4" />却下
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  この店舗は直接登録されたため、申請情報はありません
                </p>
                {/* 直接登録店舗でもapplication_pendingの場合は承認アクションを提供 */}
                {phase === "application_pending" && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      この店舗を承認して事前調査を開始しますか？
                    </p>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleOnboardingAction("approve")}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                      承認して事前調査を開始
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* オンボーディングタブ */}
      {activeTab === "onboarding" && (
        <div className="space-y-4">
          {/* 進捗概要 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">オンボーディング進捗</span>
                  {currentStep && (
                    <Badge variant="outline" className="text-xs">
                      STEP {currentStep.step}/{OWNER_VISIBLE_STEPS.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`border-0 ${phaseInfo.color} ${phaseInfo.textColor}`}>
                    {phaseInfo.label}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => { load(); loadOnboarding(); }}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${phase === "pipeline_error" ? "bg-red-400" : "bg-primary"}`}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{phaseInfo.description}</p>
            </CardContent>
          </Card>

          {/* ========== メインアクションパネル ========== */}
          <Card className={phase === "pipeline_error" ? "border-red-300 border-2" : phaseInfo.needsAction ? "border-amber-300 border-2" : "border-green-200"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                次のアクション
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ── application_pending: 承認待ち ── */}
              {phase === "application_pending" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <ClipboardCheck className="h-5 w-5" />
                    <span className="font-medium">申請の承認が必要です</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    承認すると自動的に事前調査（AIによる公開情報収集）が開始されます。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("approve")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    承認して事前調査を開始
                  </Button>
                </div>
              )}

              {/* ── approved: 承認済み → 事前調査開始 ── */}
              {phase === "approved" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Search className="h-5 w-5" />
                    <span className="font-medium">事前調査を開始できます</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AIが食べログ・Googleマップ等の公開情報から店舗データを収集・分析します。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("retry_pipeline")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    事前調査を開始
                  </Button>
                </div>
              )}

              {/* ── pre_research_running: AI処理中 ── */}
              {phase === "pre_research_running" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">事前調査を実行中...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AIが公開情報を収集しています。通常1〜3分で完了します。ページを更新して状態を確認してください。
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { load(); loadOnboarding(); }}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    最新状態を確認
                  </Button>
                </div>
              )}

              {/* ── pre_research_done: 事前調査完了 ── */}
              {phase === "pre_research_done" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">事前調査が完了しました</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    設計書の自動生成に移行しています。しばらくお待ちください。
                  </p>
                </div>
              )}

              {/* ── design_doc_generating: 設計書生成中 ── */}
              {phase === "design_doc_generating" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">インタビュー設計書を生成中...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AIが事前調査結果をもとにインタビュー質問リスト（20問）を作成しています。
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { load(); loadOnboarding(); }}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    最新状態を確認
                  </Button>
                </div>
              )}

              {/* ── ready_for_interview: インタビュー準備完了 ── */}
              {phase === "ready_for_interview" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <UserPlus className="h-5 w-5" />
                    <span className="font-medium">インタビュアーの割当が必要です</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    インタビュー設計書が完成しました。インタビュアーを割り当ててください。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("assign_interviewer", { interviewer_id: "self" })}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                    自分をインタビュアーとして割当
                  </Button>
                </div>
              )}

              {/* ── interviewer_assigned: 割当済み ── */}
              {phase === "interviewer_assigned" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">インタビュー日程の調整が必要です</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    店主と日程を調整し、インタビューを実施してください。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("update_phase", { phase: "interview_scheduled" })}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    日程確定済みにする
                  </Button>
                </div>
              )}

              {/* ── interview_scheduled: 日程確定 ── */}
              {phase === "interview_scheduled" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">インタビュー日程が確定しています</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    インタビューを実施後、完了ボタンを押してください。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("update_phase", { phase: "interview_completed" })}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    インタビュー完了
                  </Button>
                </div>
              )}

              {/* ── interview_completed: インタビュー完了 ── */}
              {phase === "interview_completed" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">インタビューが完了しました</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ストーリー生成に進みます。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("update_phase", { phase: "story_generating" })}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                    ストーリー生成を開始
                  </Button>
                </div>
              )}

              {/* ── story_generating: ストーリー生成中 ── */}
              {phase === "story_generating" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">ストーリーを生成中...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AIがインタビュー内容をもとにストーリーを執筆しています。
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { load(); loadOnboarding(); }}>
                      <RefreshCw className="h-3 w-3 mr-1" />最新状態を確認
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOnboardingAction("update_phase", { phase: "story_review" })}
                      disabled={actionLoading}
                    >
                      レビューに進む
                    </Button>
                  </div>
                </div>
              )}

              {/* ── story_review: レビュー ── */}
              {phase === "story_review" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">ストーリーのレビューが必要です</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    生成されたストーリーを確認・修正し、問題なければ次のステップに進んでください。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("update_phase", { phase: "photo_pending" })}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    レビュー完了 → 写真待ちへ
                  </Button>
                </div>
              )}

              {/* ── photo_pending: 写真待ち ── */}
              {phase === "photo_pending" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-pink-700">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">写真のアップロードを待っています</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    店舗・オーナーの写真がアップロードされたら公開に進めます。
                  </p>
                  <Button
                    onClick={() => handleOnboardingAction("update_phase", { phase: "published" })}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    公開する
                  </Button>
                </div>
              )}

              {/* ── published: 公開済み ── */}
              {phase === "published" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">オンボーディング完了！店舗ページが公開されています</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/shops/${shop.slug}`} target="_blank">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      店舗ページを確認
                    </Link>
                  </Button>
                </div>
              )}

              {/* ── pipeline_error: エラー ── */}
              {phase === "pipeline_error" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">パイプラインエラーが発生しました</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    自動処理でエラーが発生しました。再実行ボタンを押して復旧してください。
                  </p>
                  {shop.metadata && typeof shop.metadata === "object" && "pipeline_error" in shop.metadata && (
                    <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                      <p className="font-medium">エラー詳細:</p>
                      <p className="mt-1 font-mono">
                        {String((shop.metadata.pipeline_error as Record<string, unknown>)?.message || "不明なエラー")}
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => handleOnboardingAction("retry_pipeline")}
                    disabled={actionLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    パイプライン再実行
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== 事前調査結果 ========== */}
          {onboardingData && onboardingData.researchReports.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  事前調査レポート
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {onboardingData.researchReports.map((report) => (
                  <div key={report.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={report.research_status === "completed" ? "default" : "secondary"} className="text-xs">
                        {report.research_status === "completed" ? "完了" : report.research_status === "running" ? "実行中" : report.research_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString("ja-JP")}
                      </span>
                      {report.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          → {new Date(report.completed_at).toLocaleDateString("ja-JP")} 完了
                        </span>
                      )}
                    </div>
                    {report.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{report.summary}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ========== インタビュー設計書 ========== */}
          {onboardingData && onboardingData.designDocs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  インタビュー設計書
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {onboardingData.designDocs.map((doc) => (
                  <div key={doc.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={doc.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {doc.status === "completed" ? "完成" : doc.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("ja-JP")} 作成
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ========== インタビュアー割当 ========== */}
          {onboardingData && onboardingData.assignments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  インタビュアー割当
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {onboardingData.assignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.users?.nickname || "未設定"}</p>
                      {a.scheduled_date && (
                        <p className="text-xs text-muted-foreground">予定日: {a.scheduled_date}</p>
                      )}
                    </div>
                    <Badge variant={a.status === "completed" ? "default" : "secondary"} className="text-xs">
                      {a.status === "completed" ? "完了" : a.status === "assigned" ? "割当済" : a.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ========== フェーズ履歴 ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">フェーズ一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {ONBOARDING_PHASES.filter(p => p !== "pipeline_error").map((p) => {
                  const info = PHASE_METADATA[p];
                  const idx = ONBOARDING_PHASES.indexOf(p);
                  const currentIdx = ONBOARDING_PHASES.indexOf(phase as OnboardingPhase);
                  const isCompleted = idx < currentIdx && phase !== "pipeline_error";
                  const isCurrent = p === phase;

                  return (
                    <div key={p} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0 ${
                        isCompleted ? "bg-green-100 text-green-700" : isCurrent ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-400"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`text-sm flex-1 ${isCurrent ? "font-medium text-primary" : isCompleted ? "text-gray-700" : "text-gray-400"}`}>
                        {info.label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        info.actor === "ai" ? "bg-purple-50 text-purple-600" :
                        info.actor === "cs" ? "bg-blue-50 text-blue-600" :
                        info.actor === "owner" ? "bg-orange-50 text-orange-600" :
                        info.actor === "interviewer" ? "bg-green-50 text-green-600" :
                        "bg-gray-50 text-gray-500"
                      }`}>
                        {info.actor === "ai" ? "AI" : info.actor === "cs" ? "CS" : info.actor === "owner" ? "オーナー" : info.actor === "interviewer" ? "取材者" : "自動"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ========== 手動フェーズ変更 ========== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">手動フェーズ変更（上級者向け）</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                通常は上のアクションボタンを使用してください。何か問題がある場合のみ使用してください。
              </p>
              <div className="flex flex-wrap gap-1">
                {ONBOARDING_PHASES.filter(p => p !== "pipeline_error").map((p) => {
                  const info = PHASE_METADATA[p];
                  const isCurrent = p === phase;
                  return (
                    <Button
                      key={p}
                      size="sm"
                      variant={isCurrent ? "default" : "outline"}
                      className="text-xs h-7"
                      disabled={isCurrent || actionLoading}
                      onClick={() => handleOnboardingAction("update_phase", { phase: p })}
                    >
                      {info.shortLabel}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MiniCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
