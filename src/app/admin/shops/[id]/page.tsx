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
  ChevronDown,
  ChevronUp,
  Phone,
  Calendar,
  MapPin,
  MessageSquare,
  Clipboard,
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
    description?: string;
    phone?: string;
    website_url?: string;
    tabelog_url?: string;
    gmb_url?: string;
    facebook_url?: string;
    address_prefecture?: string;
    address_city?: string;
    address_street?: string;
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
    personality_hypothesis?: unknown[];
    kodawari_hypothesis?: unknown[];
    episode_hypothesis?: unknown[];
    verification_report?: Record<string, unknown>;
    // v2拡張フィールド
    shop_profile?: Record<string, unknown>;
    customer_voice_analysis?: Record<string, unknown>;
    menu_analysis?: Record<string, unknown>;
    competitive_context?: Record<string, unknown>;
    interview_strategy?: Record<string, unknown>;
    phase_hypotheses?: Record<string, unknown>;
  }[];
  designDocs: {
    id: string;
    status: string;
    created_at: string;
    questions?: unknown[];
    interview_plan?: Record<string, unknown>;
    interview_strategy?: string;
    focus_areas?: unknown[];
    opening_questions?: unknown[];
    deep_dive_questions?: unknown[];
    closing_questions?: unknown[];
    // v2拡張: interviewer_notesにガイド全体がJSON文字列で格納
    interviewer_notes?: string;
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
    scheduled_time: string | null;
    users?: { nickname: string; avatar_url: string | null };
  }[];
};

type TabKey = "info" | "onboarding";

export default function AdminShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ShopDetail | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("onboarding");
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 展開状態
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [expandedDesignDoc, setExpandedDesignDoc] = useState<string | null>(null);

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
    loadOnboarding();
  }, [load, loadOnboarding]);

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
      await loadOnboarding();
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

  const currentStep = OWNER_VISIBLE_STEPS.find((s) =>
    s.phases.includes(phase as OnboardingPhase)
  );

  // 店舗の住所
  const address = [shop.address_prefecture, shop.address_city, shop.address_street].filter(Boolean).join("");

  const TABS: { key: TabKey; label: string; badge?: string }[] = [
    { key: "onboarding", label: "オンボーディング", badge: phaseInfo.needsAction ? "要対応" : undefined },
    { key: "info", label: "基本情報・KPI" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
          <Link href="/admin/shops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{shop.name}</h1>
            <Badge variant={shop.is_published ? "default" : "secondary"} className="text-xs shrink-0">
              {shop.is_published ? <><Eye className="mr-1 h-3 w-3" />公開中</> : <><EyeOff className="mr-1 h-3 w-3" />非公開</>}
            </Badge>
            <Badge variant="outline" className={`border-0 text-xs shrink-0 ${phaseInfo.color} ${phaseInfo.textColor}`}>
              {phaseInfo.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {shop.owner_name} / {shop.area} / {shop.category}
            {currentStep && <span className="ml-2">（ステップ {currentStep.step}/{OWNER_VISIBLE_STEPS.length}）</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 hidden sm:flex">
          <Link href={`/shops/${shop.slug}`} target="_blank">
            <ExternalLink className="mr-1 h-3 w-3" />店舗ページ
          </Link>
        </Button>
      </div>

      {/* アクション結果メッセージ */}
      {actionMessage && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
          actionMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {actionMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs underline shrink-0">閉じる</button>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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

      {/* ================== オンボーディングタブ ================== */}
      {activeTab === "onboarding" && (
        <div className="space-y-4">
          {/* 進捗概要 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">進捗</span>
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
              {/* ── application_pending: 承認待ち（申請管理を統合） ── */}
              {phase === "application_pending" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <ClipboardCheck className="h-5 w-5" />
                    <span className="font-medium">申請の承認が必要です</span>
                  </div>

                  {/* 申請情報の表示 */}
                  {data.application && (
                    <div className="rounded-lg bg-gray-50 p-3 sm:p-4 space-y-2 text-sm">
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        <div><span className="text-muted-foreground">申請者:</span> {data.application.applicant_name}</div>
                        <div><span className="text-muted-foreground">申請日:</span> {new Date(data.application.created_at).toLocaleDateString("ja-JP")}</div>
                        {data.application.shop_genre && (
                          <div><span className="text-muted-foreground">ジャンル:</span> {data.application.shop_genre}</div>
                        )}
                      </div>
                      {data.application.message && (
                        <div className="rounded bg-white p-2 border">
                          <p className="text-xs text-muted-foreground mb-1">メッセージ:</p>
                          <p className="text-sm">{data.application.message}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 店舗の基本情報 */}
                  <div className="rounded-lg bg-blue-50/50 p-3 space-y-1.5 text-sm">
                    {address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{address}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{shop.phone}</span>
                      </div>
                    )}
                    {shop.website_url && (
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a href={shop.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{shop.website_url}</a>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    承認すると自動的に事前調査（AIによる公開情報収集）が開始されます。
                  </p>

                  <Textarea
                    placeholder="審査メモ（任意）"
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />

                  <div className="flex gap-2">
                    {data.application ? (
                      <>
                        <Button onClick={() => handleApplicationAction("approved")} disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                          承認して事前調査を開始
                        </Button>
                        <Button variant="outline" onClick={() => handleApplicationAction("rejected")} disabled={actionLoading}>
                          <XCircle className="mr-1 h-4 w-4" />却下
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => handleOnboardingAction("approve")} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        承認して事前調査を開始
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ── approved ── */}
              {phase === "approved" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Search className="h-5 w-5" />
                    <span className="font-medium">事前調査を開始できます</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AIが食べログ・Googleマップ等の公開情報から店舗データを収集・分析します。
                  </p>
                  <Button onClick={() => handleOnboardingAction("retry_pipeline")} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    事前調査を開始
                  </Button>
                </div>
              )}

              {/* ── pre_research_running ── */}
              {phase === "pre_research_running" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">事前調査を実行中...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AIが公開情報を収集しています。通常1〜3分で完了します。
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { load(); loadOnboarding(); }}>
                    <RefreshCw className="h-3 w-3 mr-1" />最新状態を確認
                  </Button>
                </div>
              )}

              {/* ── pre_research_done ── */}
              {phase === "pre_research_done" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">事前調査が完了しました</span>
                  </div>
                  <p className="text-sm text-muted-foreground">設計書の自動生成に移行しています。</p>
                </div>
              )}

              {/* ── design_doc_generating ── */}
              {phase === "design_doc_generating" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">インタビュー設計書を生成中...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AIが事前調査結果をもとにインタビュー質問リストを作成しています。
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { load(); loadOnboarding(); }}>
                    <RefreshCw className="h-3 w-3 mr-1" />最新状態を確認
                  </Button>
                </div>
              )}

              {/* ── ready_for_interview: インタビュアー割当 ── */}
              {phase === "ready_for_interview" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <UserPlus className="h-5 w-5" />
                    <span className="font-medium">インタビュアーの割当が必要です</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    インタビュー設計書が完成しました。下の設計書を確認し、インタビュアーを割り当ててください。
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

              {/* ── interviewer_assigned / interview_scheduled: インタビュー実施ワークフロー ── */}
              {(phase === "interviewer_assigned" || phase === "interview_scheduled") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-700">
                    <MessageSquare className="h-5 w-5" />
                    <span className="font-medium">
                      {phase === "interviewer_assigned" ? "インタビューの準備" : "インタビュー日程確定済み"}
                    </span>
                  </div>

                  {/* インタビュアー情報 */}
                  {onboardingData?.assignments && onboardingData.assignments.length > 0 && (
                    <div className="rounded-lg bg-green-50/50 border border-green-200 p-3 space-y-2">
                      <p className="text-xs font-medium text-green-800">担当インタビュアー</p>
                      {onboardingData.assignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{a.users?.nickname || "自分"}</span>
                          {a.scheduled_date && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {a.scheduled_date} {a.scheduled_time || ""}
                            </Badge>
                          )}
                          <Badge variant={a.status === "completed" ? "default" : "secondary"} className="text-xs">
                            {a.status === "completed" ? "完了" : "割当済"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 店舗連絡先（アポ取り用） */}
                  <div className="rounded-lg bg-blue-50/50 border border-blue-200 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-blue-800">店舗連絡先（アポ取り用）</p>
                    <div className="grid gap-1.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{address || "住所未設定"}</span>
                      </div>
                      {shop.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a href={`tel:${shop.phone}`} className="text-primary hover:underline">{shop.phone}</a>
                        </div>
                      )}
                      {shop.website_url && (
                        <div className="flex items-center gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a href={shop.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{shop.website_url}</a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ワークフローステップ */}
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">インタビュー実施ステップ</p>
                    <div className="space-y-1.5">
                      <StepItem
                        number={1}
                        label="下の設計書を確認して質問を把握"
                        done={true}
                      />
                      <StepItem
                        number={2}
                        label="店舗にアポイントを取る（電話 or 訪問）"
                        done={phase === "interview_scheduled"}
                      />
                      <StepItem
                        number={3}
                        label="インタビュー実施（30〜60分）"
                        done={false}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {phase === "interviewer_assigned" && (
                      <Button
                        onClick={() => handleOnboardingAction("update_phase", { phase: "interview_scheduled" })}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
                        アポ取得済み → 日程確定
                      </Button>
                    )}
                    {phase === "interview_scheduled" && (
                      <Button
                        onClick={() => handleOnboardingAction("update_phase", { phase: "interview_completed" })}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        インタビュー完了
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ── interview_completed ── */}
              {phase === "interview_completed" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">インタビューが完了しました</span>
                  </div>
                  <Button onClick={() => handleOnboardingAction("update_phase", { phase: "story_generating" })} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                    ストーリー生成を開始
                  </Button>
                </div>
              )}

              {/* ── story_generating ── */}
              {phase === "story_generating" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">ストーリーを生成中...</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { load(); loadOnboarding(); }}>
                      <RefreshCw className="h-3 w-3 mr-1" />最新状態を確認
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOnboardingAction("update_phase", { phase: "story_review" })} disabled={actionLoading}>
                      レビューに進む
                    </Button>
                  </div>
                </div>
              )}

              {/* ── story_review ── */}
              {phase === "story_review" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">ストーリーのレビューが必要です</span>
                  </div>
                  <Button onClick={() => handleOnboardingAction("update_phase", { phase: "photo_pending" })} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    レビュー完了 → 写真待ちへ
                  </Button>
                </div>
              )}

              {/* ── photo_pending ── */}
              {phase === "photo_pending" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-pink-700">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">写真のアップロードを待っています</span>
                  </div>
                  <Button onClick={() => handleOnboardingAction("update_phase", { phase: "published" })} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    公開する
                  </Button>
                </div>
              )}

              {/* ── published ── */}
              {phase === "published" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">オンボーディング完了！店舗ページが公開されています</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/shops/${shop.slug}`} target="_blank">
                      <ExternalLink className="h-3 w-3 mr-1" />店舗ページを確認
                    </Link>
                  </Button>
                </div>
              )}

              {/* ── pipeline_error ── */}
              {phase === "pipeline_error" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">パイプラインエラーが発生しました</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    自動処理でエラーが発生しました。再実行ボタンを押して復旧してください。
                  </p>
                  {/* エラー詳細（descriptionから取得） */}
                  {shop.description && shop.description.startsWith("[Pipeline Error") && (() => {
                    const match = shop.description.match(/^\[Pipeline Error (.+?)\] (.+)$/);
                    const message = match?.[2] || shop.description;
                    const occurredAt = match?.[1];
                    return (
                      <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 space-y-1">
                        <p className="font-medium">エラー詳細:</p>
                        <p className="font-mono break-all">{message}</p>
                        {occurredAt && <p className="text-red-400">{new Date(occurredAt).toLocaleString("ja-JP")}</p>}
                      </div>
                    );
                  })()}
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

          {/* ========== 事前調査レポート（詳細閲覧可能） ========== */}
          {onboardingData && onboardingData.researchReports.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  事前調査レポート
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {onboardingData.researchReports.map((report) => {
                  const isExpanded = expandedReport === report.id;
                  return (
                    <div key={report.id} className="rounded-lg border">
                      {/* ヘッダー */}
                      <button
                        onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={report.research_status === "completed" ? "default" : "secondary"} className="text-xs">
                            {report.research_status === "completed" ? "完了" : report.research_status === "in_progress" ? "実行中" : report.research_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {/* 展開コンテンツ */}
                      {isExpanded && (
                        <div className="border-t px-4 py-3 space-y-4 text-sm">
                          {/* 人柄仮説 */}
                          {report.personality_hypothesis && Array.isArray(report.personality_hypothesis) && report.personality_hypothesis.length > 0 && (
                            <HypothesisSection title="🧑 人柄仮説" items={report.personality_hypothesis as HypothesisItem[]} />
                          )}

                          {/* こだわり仮説 */}
                          {report.kodawari_hypothesis && Array.isArray(report.kodawari_hypothesis) && report.kodawari_hypothesis.length > 0 && (
                            <HypothesisSection title="✨ こだわり仮説" items={report.kodawari_hypothesis as HypothesisItem[]} />
                          )}

                          {/* エピソード仮説 */}
                          {report.episode_hypothesis && Array.isArray(report.episode_hypothesis) && report.episode_hypothesis.length > 0 && (
                            <HypothesisSection title="📖 エピソード仮説" items={report.episode_hypothesis as HypothesisItem[]} />
                          )}

                          {/* 口コミ分析（v2） */}
                          {report.customer_voice_analysis && typeof report.customer_voice_analysis === "object" && (() => {
                            const cva = report.customer_voice_analysis as Record<string, unknown>;
                            const positiveThemes = cva.positive_themes as Array<Record<string, unknown>> | undefined;
                            const uniqueEpisodes = cva.unique_episodes as Array<Record<string, unknown>> | undefined;
                            const emotionalKw = cva.emotional_keywords as string[] | undefined;
                            return (
                              <div>
                                <p className="font-medium text-muted-foreground mb-2">💬 口コミ分析</p>
                                {cva.total_reviews_analyzed != null && (
                                  <p className="text-xs text-muted-foreground mb-1">分析口コミ数: {String(cva.total_reviews_analyzed)}</p>
                                )}
                                {positiveThemes && positiveThemes.length > 0 && (
                                  <div className="space-y-1.5 mb-2">
                                    {positiveThemes.map((t, ti) => (
                                      <div key={ti} className="rounded bg-green-50 p-2 text-xs">
                                        <span className="font-semibold text-green-800">{String(t.theme)}</span>
                                        {t.frequency != null && <span className="text-green-600 ml-2">({String(t.frequency)})</span>}
                                        {t.representative_quotes != null && (
                                          <p className="text-green-700 mt-0.5 italic">{(t.representative_quotes as string[]).map(q => `「${q}」`).join(" ")}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {uniqueEpisodes && uniqueEpisodes.length > 0 && (
                                  <div className="space-y-1 mb-2">
                                    <p className="text-xs font-medium text-gray-500">ユニークなエピソード:</p>
                                    {uniqueEpisodes.map((e, ei) => (
                                      <div key={ei} className="text-xs bg-gray-50 rounded p-2">
                                        <p>{String(e.content)}</p>
                                        {e.interview_lead != null && <p className="text-blue-600 mt-0.5">💡 {String(e.interview_lead)}</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {emotionalKw && emotionalKw.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {emotionalKw.map((kw, ki) => (
                                      <Badge key={ki} variant="outline" className="text-[10px]">{kw}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* メニュー分析（v2） */}
                          {report.menu_analysis && typeof report.menu_analysis === "object" && (() => {
                            const ma = report.menu_analysis as Record<string, unknown>;
                            const dishes = ma.signature_dishes as Array<Record<string, unknown>> | undefined;
                            return (
                              <div>
                                <p className="font-medium text-muted-foreground mb-2">🍽️ メニュー分析</p>
                                {ma.menu_philosophy != null && <p className="text-xs text-gray-700 mb-2">{String(ma.menu_philosophy)}</p>}
                                {dishes && dishes.length > 0 && (
                                  <div className="space-y-1.5">
                                    {dishes.map((d, di) => (
                                      <div key={di} className="rounded bg-amber-50 p-2 text-xs">
                                        <span className="font-semibold text-amber-800">{String(d.name)}</span>
                                        {d.price != null && <span className="text-amber-600 ml-2">{String(d.price)}</span>}
                                        {d.mentions_in_reviews != null && <span className="text-gray-500 ml-2">(言及{String(d.mentions_in_reviews)}回)</span>}
                                        {d.story_angle != null && <p className="text-amber-700 mt-0.5">📖 {String(d.story_angle)}</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* インタビュー戦略（v2） */}
                          {report.interview_strategy && typeof report.interview_strategy === "object" && (() => {
                            const is = report.interview_strategy as Record<string, unknown>;
                            const angles = is.recommended_angles as Array<Record<string, unknown>> | undefined;
                            const cautions = is.caution_topics as string[] | undefined;
                            return (
                              <div>
                                <p className="font-medium text-muted-foreground mb-2">🎯 インタビュー戦略提案</p>
                                {is.owner_communication_style != null && (
                                  <div className="text-xs bg-indigo-50 rounded p-2 text-indigo-800 mb-2">
                                    <span className="font-bold">👤 店主のスタイル: </span>{String(is.owner_communication_style)}
                                  </div>
                                )}
                                {is.rapport_building_tips != null && (
                                  <div className="text-xs bg-pink-50 rounded p-2 text-pink-800 mb-2">
                                    <span className="font-bold">🤝 打ち解け方: </span>{String(is.rapport_building_tips)}
                                  </div>
                                )}
                                {angles && angles.length > 0 && (
                                  <div className="space-y-1.5 mb-2">
                                    {angles.map((a, ai) => (
                                      <div key={ai} className="rounded bg-blue-50 p-2 text-xs">
                                        <span className="font-semibold text-blue-800">{String(a.angle)}</span>
                                        {a.reason != null && <p className="text-blue-600">{String(a.reason)}</p>}
                                        {a.expected_story_type != null && <p className="text-blue-500">→ {String(a.expected_story_type)}</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {cautions && cautions.length > 0 && (
                                  <div className="text-xs bg-red-50 rounded p-2 text-red-800">
                                    <span className="font-bold">⚠️ 避けるべき話題: </span>
                                    {cautions.join("、")}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* 7フェーズ別仮説（v2） */}
                          {report.phase_hypotheses && typeof report.phase_hypotheses === "object" && (() => {
                            const ph = report.phase_hypotheses as Record<string, unknown>;
                            const PHASES = [
                              { key: "icebreak", emoji: "☕", label: "アイスブレイク", color: "bg-green-50 text-green-800" },
                              { key: "origin", emoji: "🔥", label: "原点の物語", color: "bg-orange-50 text-orange-800" },
                              { key: "kodawari", emoji: "✨", label: "こだわりの深層", color: "bg-blue-50 text-blue-800" },
                              { key: "signature_dish", emoji: "🍽️", label: "食べてほしい一品", color: "bg-amber-50 text-amber-800" },
                              { key: "regulars", emoji: "💛", label: "常連さんとの関係", color: "bg-pink-50 text-pink-800" },
                              { key: "community", emoji: "🏘️", label: "地域・コミュニティ", color: "bg-teal-50 text-teal-800" },
                              { key: "future", emoji: "🚀", label: "未来への想い", color: "bg-purple-50 text-purple-800" },
                            ];
                            return (
                              <div>
                                <p className="font-medium text-muted-foreground mb-2">🎯 7フェーズ別インタビュー準備情報</p>
                                <div className="space-y-3">
                                  {PHASES.map(({ key, emoji, label, color }) => {
                                    const phaseData = ph[key] as Record<string, unknown> | undefined;
                                    if (!phaseData) return null;
                                    const hyps = phaseData.hypotheses as Array<Record<string, unknown>> | undefined;
                                    return (
                                      <div key={key} className={`rounded-lg p-3 ${color}`}>
                                        <p className="text-xs font-bold mb-1">{emoji} {label}</p>
                                        {phaseData.goal != null && (
                                          <p className="text-[10px] mb-1.5 opacity-80">目標: {String(phaseData.goal)}</p>
                                        )}
                                        {phaseData.atmosphere_tips != null && (
                                          <p className="text-[10px] mb-1.5 italic">💡 {String(phaseData.atmosphere_tips)}</p>
                                        )}
                                        {phaseData.timeline_clues != null && (
                                          <p className="text-[10px] mb-1.5">📅 {String(phaseData.timeline_clues)}</p>
                                        )}
                                        {phaseData.comparison_points != null && (
                                          <p className="text-[10px] mb-1.5">🔍 差別化: {String(phaseData.comparison_points)}</p>
                                        )}
                                        {phaseData.menu_context != null && (
                                          <p className="text-[10px] mb-1.5">📋 {String(phaseData.menu_context)}</p>
                                        )}
                                        {phaseData.relationship_style != null && (
                                          <p className="text-[10px] mb-1.5">🤝 {String(phaseData.relationship_style)}</p>
                                        )}
                                        {phaseData.local_context != null && (
                                          <p className="text-[10px] mb-1.5">📍 {String(phaseData.local_context)}</p>
                                        )}
                                        {phaseData.closing_theme != null && (
                                          <p className="text-[10px] mb-1.5">🎬 締め: {String(phaseData.closing_theme)}</p>
                                        )}
                                        {hyps && hyps.length > 0 && (
                                          <div className="space-y-1.5 mt-1">
                                            {hyps.map((h, hi) => (
                                              <div key={hi} className="bg-white/60 rounded p-2 text-[11px]">
                                                <p className="font-semibold">{String(h.topic || h.dish_name || "")}</p>
                                                {h.evidence != null && <p className="opacity-70 mt-0.5">📊 {String(h.evidence)}</p>}
                                                {h.suggested_opener != null && <p className="mt-0.5 font-medium">💬 「{String(h.suggested_opener)}」</p>}
                                                {h.key_question != null && <p className="mt-0.5 font-medium">❓ {String(h.key_question)}</p>}
                                                {h.deep_dive_angle != null && <p className="mt-0.5">🔎 {String(h.deep_dive_angle)}</p>}
                                                {h.sensory_question != null && <p className="mt-0.5 italic">🎯 {String(h.sensory_question)}</p>}
                                                {h.story_angle != null && <p className="mt-0.5">📖 {String(h.story_angle)}</p>}
                                                {h.customer_voice != null && <p className="mt-0.5 italic">👥 {String(h.customer_voice)}</p>}
                                                {h.episode_lead != null && <p className="mt-0.5 font-medium">💬 {String(h.episode_lead)}</p>}
                                                {h.question_angle != null && <p className="mt-0.5">❓ {String(h.question_angle)}</p>}
                                                {h.expected_depth != null && <p className="mt-0.5 opacity-70">📐 深掘り可能性: {String(h.expected_depth)}</p>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* 検証レポート */}
                          {report.verification_report && (
                            <div className="rounded-lg bg-yellow-50/50 p-3 space-y-1">
                              <p className="font-medium text-yellow-800">🔍 検証レポート</p>
                              <p className="text-xs text-yellow-700">
                                リスク: {String((report.verification_report as Record<string, unknown>).overall_risk || "不明")}
                                {" / "}
                                推奨: {String((report.verification_report as Record<string, unknown>).recommendation || "不明")}
                              </p>
                              {(report.verification_report as Record<string, unknown>).notes != null && (
                                <p className="text-xs text-yellow-600">{String((report.verification_report as Record<string, unknown>).notes)}</p>
                              )}
                            </div>
                          )}

                          {/* データがない場合 */}
                          {(!report.personality_hypothesis || (report.personality_hypothesis as unknown[]).length === 0) &&
                           (!report.kodawari_hypothesis || (report.kodawari_hypothesis as unknown[]).length === 0) &&
                           (!report.episode_hypothesis || (report.episode_hypothesis as unknown[]).length === 0) && (
                            <p className="text-muted-foreground text-xs">レポートデータが見つかりません（ステータス: {report.research_status}）</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* ========== インタビュー設計書（詳細閲覧可能） ========== */}
          {onboardingData && onboardingData.designDocs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  インタビュー設計書
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-xs"
                    onClick={() => {
                      const doc = onboardingData.designDocs[0];
                      if (doc) {
                        const text = formatDesignDocForCopy(doc);
                        navigator.clipboard.writeText(text);
                        setActionMessage({ type: "success", text: "設計書をクリップボードにコピーしました" });
                        setTimeout(() => setActionMessage(null), 2000);
                      }
                    }}
                  >
                    <Clipboard className="h-3 w-3 mr-1" />コピー
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {onboardingData.designDocs.map((doc) => {
                  const isExpanded = expandedDesignDoc === doc.id;
                  return (
                    <div key={doc.id} className="rounded-lg border">
                      <button
                        onClick={() => setExpandedDesignDoc(isExpanded ? null : doc.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.status === "completed" ? "default" : "secondary"} className="text-xs">
                            {doc.status === "completed" ? "完成" : doc.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString("ja-JP")} 作成
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {isExpanded && (() => {
                        // interviewer_notesからガイドデータを取得
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        let guideData: Record<string, any> | null = null;
                        if (doc.interviewer_notes) {
                          try {
                            guideData = JSON.parse(doc.interviewer_notes);
                          } catch { /* パース失敗時はnull */ }
                        }

                        return (
                          <div className="border-t px-4 py-3 space-y-4 text-sm">
                            {/* インタビューガイド（v2形式） */}
                            {guideData && (
                              <InterviewerGuideSection guideData={guideData} />
                            )}

                            {/* フォーカスエリア */}
                            {doc.focus_areas && Array.isArray(doc.focus_areas) && doc.focus_areas.length > 0 && (
                              <div>
                                <p className="font-medium text-muted-foreground mb-2">🎯 フォーカスエリア</p>
                                <div className="space-y-1.5">
                                  {(doc.focus_areas as unknown[]).map((area, i) => {
                                    if (typeof area === "string") {
                                      return <Badge key={i} variant="outline" className="text-xs mr-1">{area}</Badge>;
                                    }
                                    const a = area as Record<string, string>;
                                    return (
                                      <div key={i} className="rounded bg-gray-50 p-2">
                                        <p className="text-xs font-semibold">{a.area || a.name || JSON.stringify(area)}</p>
                                        {a.reason && <p className="text-[10px] text-muted-foreground">{a.reason}</p>}
                                        {a.target_output && <p className="text-[10px] text-purple-600">→ {a.target_output}</p>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 質問リスト（v2: リッチ表示） */}
                            {doc.questions && Array.isArray(doc.questions) && doc.questions.length > 0 && (
                              <div>
                                <p className="font-medium text-muted-foreground mb-2">📋 質問リスト（{(doc.questions as unknown[]).length}問）— クリックで詳細を展開</p>
                                <DesignDocQuestionList questions={doc.questions as Record<string, unknown>[]} />
                              </div>
                            )}

                            {/* 旧形式の質問セクション対応 */}
                            {doc.opening_questions && Array.isArray(doc.opening_questions) && (doc.opening_questions as unknown[]).length > 0 && (
                              <QuestionSection title="🟢 オープニング" items={doc.opening_questions as QuestionItem[]} />
                            )}
                            {doc.deep_dive_questions && Array.isArray(doc.deep_dive_questions) && (doc.deep_dive_questions as unknown[]).length > 0 && (
                              <QuestionSection title="🔵 深掘り" items={doc.deep_dive_questions as QuestionItem[]} />
                            )}
                            {doc.closing_questions && Array.isArray(doc.closing_questions) && (doc.closing_questions as unknown[]).length > 0 && (
                              <QuestionSection title="🟠 クロージング" items={doc.closing_questions as QuestionItem[]} />
                            )}

                            {/* データがない場合 */}
                            {(!doc.questions || (doc.questions as unknown[]).length === 0) &&
                             (!doc.opening_questions || (doc.opening_questions as unknown[]).length === 0) &&
                             (!guideData) && (
                              <p className="text-muted-foreground text-xs">設計書の詳細データを読み込めませんでした（ステータス: {doc.status}）</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* ========== フェーズ一覧 ========== */}
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
                通常は上のアクションボタンを使用してください。
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

      {/* ================== 基本情報・KPIタブ ================== */}
      {activeTab === "info" && (
        <>
          {/* KPIサマリ */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <MiniCard icon={Heart} label="ファン数" value={oshi_count} color="text-red-600" bg="bg-red-50" />
            <MiniCard icon={MessageCircle} label="共感タップ数" value={empathy_total} color="text-pink-600" bg="bg-pink-50" />
            <MiniCard icon={BookOpen} label="ストーリー数" value={stories.length} color="text-orange-600" bg="bg-orange-50" />
            <MiniCard icon={Mail} label="メッセージ配信" value={message_count} color="text-blue-600" bg="bg-blue-50" />
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
                        <span className="w-24 sm:w-32 shrink-0 truncate text-sm">{item.tag}</span>
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
              ) : stories.map((story) => (
                <div key={story.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium">{story.title}</h4>
                    <p className="text-xs text-muted-foreground">{new Date(story.created_at).toLocaleDateString("ja-JP")}</p>
                  </div>
                  <Badge variant={story.status === "published" ? "default" : "secondary"} className="text-xs">
                    {story.status === "published" ? "公開中" : "下書き"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* メニュー一覧 */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">メニュー</CardTitle></CardHeader>
            <CardContent className="divide-y p-0">
              {menus.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">メニューはまだありません</p>
              ) : menus.map((menu) => (
                <div key={menu.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1"><h4 className="font-medium">{menu.name}</h4></div>
                  {menu.is_signature && <Badge variant="outline" className="text-xs">看板メニュー</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {menu.price > 0 ? `¥${menu.price.toLocaleString()}` : "—"}
                  </span>
                </div>
              ))}
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
              ) : interviews.map((iv) => (
                <div key={iv.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{new Date(iv.created_at).toLocaleDateString("ja-JP")} 開始</p>
                    <p className="text-xs text-muted-foreground">フェーズ {iv.current_phase}/6</p>
                  </div>
                  <Badge variant={iv.status === "completed" ? "default" : "secondary"} className="text-xs">
                    {iv.status === "completed" ? "完了" : iv.status === "in_progress" ? "進行中" : iv.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── サブコンポーネント ───

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
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
          <p className="text-lg sm:text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StepItem({ number, label, done }: { number: number; label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium shrink-0 ${
        done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : number}
      </div>
      <span className={`text-xs ${done ? "text-green-700 line-through" : "text-gray-700"}`}>{label}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HypothesisItem = Record<string, any> | string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuestionItem = Record<string, any> | string;

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-600",
};

function HypothesisSection({ title, items }: { title: string; items: HypothesisItem[] }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground mb-2">{title}</p>
      <div className="space-y-3">
        {items.map((item, i) => {
          if (typeof item === "string") {
            return <p key={i} className="text-sm pl-4 border-l-2 border-gray-200">{item}</p>;
          }
          const label = item.trait || item.axis || item.topic || item.hypothesis || item.title || item.description || "—";
          const evidence = item.evidence || "";
          const confidence = item.confidence || "";
          const source = item.source || "";
          const interviewVerification = item.interview_verification || item.interview_angle || "";
          const storyPotential = item.story_potential;
          const emotionalPotential = item.emotional_potential || "";
          const questions = item.questions as string[] | undefined;

          return (
            <div key={i} className="rounded-lg bg-gray-50 p-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-sm font-semibold flex-1">{label}</span>
                {confidence && (
                  <Badge className={`text-[10px] shrink-0 ${CONFIDENCE_COLORS[confidence] || "bg-gray-100 text-gray-600"}`}>
                    {confidence}
                  </Badge>
                )}
              </div>
              {evidence && (
                <div className="text-xs text-gray-600 bg-white rounded p-2 border border-gray-100">
                  <span className="font-medium text-gray-500">根拠: </span>{evidence}
                </div>
              )}
              {source && <p className="text-[10px] text-muted-foreground">情報源: {source}</p>}
              {interviewVerification && (
                <div className="text-xs text-blue-700 bg-blue-50 rounded p-2">
                  <span className="font-medium">💡 インタビューで確認: </span>{interviewVerification}
                </div>
              )}
              {storyPotential && (
                <p className="text-[10px] text-purple-600">ストーリー魅力度: {"⭐".repeat(typeof storyPotential === "number" ? storyPotential : 3)}</p>
              )}
              {emotionalPotential && (
                <p className="text-xs text-pink-600 italic">{emotionalPotential}</p>
              )}
              {questions && questions.length > 0 && (
                <div className="text-xs space-y-0.5 mt-1">
                  <p className="font-medium text-gray-500">質問案:</p>
                  {questions.map((q, qi) => (
                    <p key={qi} className="pl-3 text-gray-600">• {q}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DesignDocQuestionList({ questions }: { questions: any[] }) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const PHASE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
    icebreak: { emoji: "☕", label: "アイスブレイク", color: "bg-green-50 text-green-700" },
    warmup: { emoji: "☕", label: "ウォームアップ", color: "bg-green-50 text-green-700" },
    origin: { emoji: "🔥", label: "原点の物語", color: "bg-orange-50 text-orange-700" },
    kodawari: { emoji: "✨", label: "こだわりの深層", color: "bg-blue-50 text-blue-700" },
    signature_dish: { emoji: "🍽️", label: "食べてほしい一品", color: "bg-amber-50 text-amber-700" },
    regulars: { emoji: "💛", label: "常連さんとの関係", color: "bg-pink-50 text-pink-700" },
    community: { emoji: "🏘️", label: "地域・コミュニティ", color: "bg-teal-50 text-teal-700" },
    future: { emoji: "🌟", label: "未来への想い", color: "bg-purple-50 text-purple-700" },
  };

  let lastPhase = "";

  return (
    <div className="space-y-2">
      {questions.map((q, i) => {
        if (typeof q === "string") {
          return <p key={i} className="text-sm pl-4 border-l-2 border-gray-200">{q}</p>;
        }
        const phase = q.phase || "";
        const showPhaseHeader = phase !== lastPhase;
        if (showPhaseHeader) lastPhase = phase;
        const phaseInfo = PHASE_LABELS[phase] || { emoji: "📋", label: phase, color: "bg-gray-50 text-gray-700" };
        const isExpanded = expandedQ === i;
        const priority = q.priority || "";
        const priorityColor = priority === "must_ask" ? "bg-red-100 text-red-700" : priority === "nice_to_have" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500";

        return (
          <div key={i}>
            {showPhaseHeader && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mt-3 mb-1 ${phaseInfo.color}`}>
                <span>{phaseInfo.emoji}</span>
                <span className="text-xs font-bold">{phaseInfo.label}</span>
              </div>
            )}
            <div className="rounded-lg border hover:bg-gray-50/50 transition-colors">
              <button
                onClick={() => setExpandedQ(isExpanded ? null : i)}
                className="w-full text-left px-3 py-2 flex items-start gap-2"
              >
                <span className="text-xs font-bold text-muted-foreground mt-0.5 w-6 shrink-0">{String(q.order || i + 1)}.</span>
                <span className="text-sm flex-1 font-medium">{String(q.question || q.text || JSON.stringify(q))}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {priority && <Badge className={`text-[9px] ${priorityColor}`}>{priority === "must_ask" ? "必須" : priority === "nice_to_have" ? "推奨" : "省略可"}</Badge>}
                  {q.time_guide != null && <span className="text-[10px] text-muted-foreground">{String(q.time_guide)}</span>}
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t pt-2">
                  {/* 質問の意図 */}
                  {q.intent != null && (
                    <div className="text-xs bg-blue-50 rounded p-2 text-blue-800">
                      <span className="font-bold">🎯 意図: </span>{String(q.intent)}
                    </div>
                  )}

                  {/* 注目ポイント */}
                  {q.what_to_listen_for != null && (
                    <div className="text-xs bg-amber-50 rounded p-2 text-amber-800">
                      <span className="font-bold">👂 注目: </span>{String(q.what_to_listen_for)}
                    </div>
                  )}

                  {/* 深掘りシナリオ */}
                  {q.follow_up_scenarios && Array.isArray(q.follow_up_scenarios) && q.follow_up_scenarios.length > 0 && (
                    <div className="text-xs space-y-1.5">
                      <p className="font-bold text-gray-500">🔄 深掘りシナリオ:</p>
                      {q.follow_up_scenarios.map((s: Record<string, string>, si: number) => (
                        <div key={si} className="bg-green-50 rounded p-2 text-green-800">
                          <p><span className="font-semibold">もし: </span>{s.if_answer}</p>
                          <p><span className="font-semibold">→ 聞く: </span><span className="font-medium">&ldquo;{s.then_ask}&rdquo;</span></p>
                          {s.why && <p className="text-[10px] text-green-600 mt-0.5">理由: {s.why}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 旧形式のfollow_up_hints対応 */}
                  {q.follow_up_hints && Array.isArray(q.follow_up_hints) && q.follow_up_hints.length > 0 && !q.follow_up_scenarios && (
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-500">💡 深掘りヒント:</p>
                      {(q.follow_up_hints as string[]).map((h: string, hi: number) => (
                        <p key={hi} className="pl-3 text-gray-600">• {h}</p>
                      ))}
                    </div>
                  )}

                  {/* 次の質問へのつなぎ */}
                  {q.transition_to_next != null && (
                    <div className="text-xs text-purple-700 bg-purple-50 rounded p-2">
                      <span className="font-bold">➡️ 次へのつなぎ: </span>{String(q.transition_to_next)}
                    </div>
                  )}

                  {/* 根拠 */}
                  {q.based_on != null && (
                    <p className="text-[10px] text-muted-foreground">📊 根拠: {String(q.based_on)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InterviewerGuideSection({ guideData }: { guideData: Record<string, any> }) {
  const overview = guideData.interview_overview || {};
  const guide = guideData.interviewer_guide || {};
  const postInterview = guideData.post_interview || {};

  return (
    <div className="space-y-4">
      {/* インタビュー概要 */}
      {overview.strategy && (
        <div className="bg-indigo-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold text-indigo-800">🎯 インタビュー戦略</p>
          <p className="text-sm text-indigo-900">{overview.strategy}</p>
          {overview.key_story_hypothesis && (
            <div className="bg-white rounded p-2 border border-indigo-100">
              <p className="text-xs font-medium text-indigo-700">ストーリー仮説:</p>
              <p className="text-sm text-indigo-900 font-medium">{overview.key_story_hypothesis}</p>
            </div>
          )}
          {overview.owner_communication_style && (
            <p className="text-xs text-indigo-700">👤 店主の特徴: {overview.owner_communication_style}</p>
          )}
        </div>
      )}

      {/* 準備チェックリスト */}
      {guide.before_interview && (
        <div className="bg-green-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold text-green-800">✅ 準備チェックリスト</p>
          {guide.before_interview.preparation_checklist && (
            <div className="space-y-1">
              {(guide.before_interview.preparation_checklist as string[]).map((item: string, i: number) => (
                <label key={i} className="flex items-start gap-2 text-xs text-green-900">
                  <input type="checkbox" className="mt-0.5 rounded" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          )}
          {guide.before_interview.dress_code && (
            <p className="text-xs text-green-700">👔 服装: {guide.before_interview.dress_code}</p>
          )}
          {guide.before_interview.mindset && (
            <p className="text-xs text-green-700 italic">💭 {guide.before_interview.mindset}</p>
          )}
        </div>
      )}

      {/* 挨拶テンプレート */}
      {guide.opening_script && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-bold text-blue-800">🎤 挨拶テンプレート（そのまま読んでOK）</p>
          <p className="text-sm text-blue-900 whitespace-pre-wrap border-l-3 border-blue-300 pl-3 bg-white rounded p-2">&ldquo;{guide.opening_script}&rdquo;</p>
        </div>
      )}

      {/* 沈黙の対処法 */}
      {guide.silence_handling && typeof guide.silence_handling === "object" && (
        <div className="bg-amber-50 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-bold text-amber-800">🤫 沈黙の対処法</p>
          {Object.entries(guide.silence_handling as Record<string, string>).map(([key, val]) => (
            <div key={key} className="text-xs text-amber-900">
              <span className="font-semibold">{key.replace(/_/g, " ")}: </span>{val}
            </div>
          ))}
        </div>
      )}

      {/* トラブル対応 */}
      {guide.trouble_shooting && typeof guide.trouble_shooting === "object" && (
        <div className="bg-red-50 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-bold text-red-800">⚠️ トラブル対応マニュアル</p>
          {Object.entries(guide.trouble_shooting as Record<string, string>).map(([key, val]) => (
            <div key={key} className="text-xs text-red-900">
              <span className="font-semibold">{key.replace(/_/g, " ")}: </span>{val}
            </div>
          ))}
        </div>
      )}

      {/* 締めの挨拶 */}
      {guide.closing_script && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-bold text-blue-800">🎤 締めの挨拶テンプレート</p>
          <p className="text-sm text-blue-900 whitespace-pre-wrap border-l-3 border-blue-300 pl-3 bg-white rounded p-2">&ldquo;{guide.closing_script}&rdquo;</p>
        </div>
      )}

      {/* インタビュー後のアクション */}
      {postInterview.immediate_actions && (
        <div className="bg-purple-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold text-purple-800">📝 インタビュー直後にやること</p>
          <div className="space-y-1">
            {(postInterview.immediate_actions as string[]).map((action: string, i: number) => (
              <label key={i} className="flex items-start gap-2 text-xs text-purple-900">
                <input type="checkbox" className="mt-0.5 rounded" />
                <span>{action}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {postInterview.quality_check && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-bold text-gray-800">✅ 品質チェック</p>
          {(postInterview.quality_check as string[]).map((check: string, i: number) => (
            <p key={i} className="text-xs text-gray-700">• {check}</p>
          ))}
        </div>
      )}

      {postInterview.thank_you_template && (
        <div className="bg-pink-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-bold text-pink-800">💌 お礼メッセージテンプレート</p>
          <p className="text-sm text-pink-900 bg-white rounded p-2 border border-pink-100">{postInterview.thank_you_template}</p>
        </div>
      )}
    </div>
  );
}

function QuestionSection({ title, items }: { title: string; items: QuestionItem[] }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground mb-2">{title}</p>
      <ol className="space-y-1.5 list-decimal list-inside">
        {items.map((q, i) => {
          const text = typeof q === "string" ? q : q.question || q.text || JSON.stringify(q);
          const purpose = typeof q === "object" ? q.purpose || q.intent : undefined;
          return (
            <li key={i} className="text-sm">
              <span>{text}</span>
              {purpose && <p className="ml-5 text-xs text-muted-foreground">目的: {purpose}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatDesignDocForCopy(doc: OnboardingDetail["designDocs"][0]): string {
  const lines: string[] = ["━━━━━━━━━━━━━━━━━━━━━━", "　インタビュー設計書", "━━━━━━━━━━━━━━━━━━━━━━", ""];

  // ガイドデータの取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let guideData: Record<string, any> | null = null;
  if (doc.interviewer_notes) {
    try { guideData = JSON.parse(doc.interviewer_notes); } catch { /* */ }
  }

  // インタビュー概要
  if (guideData?.interview_overview?.strategy) {
    lines.push("■ インタビュー戦略");
    lines.push(guideData.interview_overview.strategy);
    if (guideData.interview_overview.key_story_hypothesis) {
      lines.push(`ストーリー仮説: ${guideData.interview_overview.key_story_hypothesis}`);
    }
    if (guideData.interview_overview.owner_communication_style) {
      lines.push(`店主の特徴: ${guideData.interview_overview.owner_communication_style}`);
    }
    lines.push("");
  }

  // 準備チェックリスト
  if (guideData?.interviewer_guide?.before_interview?.preparation_checklist) {
    lines.push("■ 準備チェックリスト");
    (guideData.interviewer_guide.before_interview.preparation_checklist as string[]).forEach((item: string) => {
      lines.push(`  □ ${item}`);
    });
    if (guideData.interviewer_guide.before_interview.dress_code) {
      lines.push(`  服装: ${guideData.interviewer_guide.before_interview.dress_code}`);
    }
    lines.push("");
  }

  // 挨拶テンプレート
  if (guideData?.interviewer_guide?.opening_script) {
    lines.push("■ 挨拶テンプレート（そのまま読んでOK）");
    lines.push(`「${guideData.interviewer_guide.opening_script}」`);
    lines.push("");
  }

  // フォーカスエリア
  if (doc.focus_areas && Array.isArray(doc.focus_areas) && doc.focus_areas.length > 0) {
    lines.push("■ フォーカスエリア");
    (doc.focus_areas as unknown[]).forEach((a) => {
      if (typeof a === "string") {
        lines.push(`  - ${a}`);
      } else {
        const area = a as Record<string, string>;
        lines.push(`  - ${area.area || JSON.stringify(a)}`);
        if (area.reason) lines.push(`    理由: ${area.reason}`);
      }
    });
    lines.push("");
  }

  // 質問リスト
  const questions = doc.questions && Array.isArray(doc.questions) ? doc.questions : [];
  if (questions.length > 0) {
    lines.push("■ 質問リスト");
    let lastPhase = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (questions as Record<string, any>[]).forEach((q, i) => {
      if (typeof q === "string") {
        lines.push(`${i + 1}. ${q}`);
        return;
      }
      const phase = q.phase || "";
      if (phase !== lastPhase) {
        const phaseLabels: Record<string, string> = {
          icebreak: "☕ アイスブレイク", warmup: "☕ ウォームアップ", origin: "🔥 原点の物語",
          kodawari: "✨ こだわりの深層", signature_dish: "🍽️ 食べてほしい一品", regulars: "💛 常連さんとの関係",
          community: "🏘️ 地域・コミュニティ", future: "🌟 未来への想い",
        };
        lines.push(`\n【${phaseLabels[phase] || phase}】`);
        lastPhase = phase;
      }
      const priority = q.priority === "must_ask" ? "[必須]" : q.priority === "nice_to_have" ? "[推奨]" : "";
      lines.push(`${q.order || i + 1}. ${priority} ${q.question || q.text || JSON.stringify(q)}`);
      if (q.intent) lines.push(`   🎯 意図: ${q.intent}`);
      if (q.what_to_listen_for) lines.push(`   👂 注目: ${q.what_to_listen_for}`);
      if (q.follow_up_scenarios && Array.isArray(q.follow_up_scenarios)) {
        q.follow_up_scenarios.forEach((s: Record<string, string>) => {
          lines.push(`   → もし「${s.if_answer}」→「${s.then_ask}」`);
        });
      } else if (q.follow_up_hints && Array.isArray(q.follow_up_hints)) {
        (q.follow_up_hints as string[]).forEach((h: string) => lines.push(`   💡 ${h}`));
      }
      if (q.transition_to_next) lines.push(`   ➡️ 次へ: ${q.transition_to_next}`);
      if (q.time_guide) lines.push(`   ⏱️ ${q.time_guide}`);
    });
    lines.push("");
  }

  // 沈黙対処法
  if (guideData?.interviewer_guide?.silence_handling) {
    lines.push("■ 沈黙の対処法");
    Object.entries(guideData.interviewer_guide.silence_handling as Record<string, string>).forEach(([key, val]) => {
      lines.push(`  ${key}: ${val}`);
    });
    lines.push("");
  }

  // トラブル対応
  if (guideData?.interviewer_guide?.trouble_shooting) {
    lines.push("■ トラブル対応");
    Object.entries(guideData.interviewer_guide.trouble_shooting as Record<string, string>).forEach(([key, val]) => {
      lines.push(`  ${key}: ${val}`);
    });
    lines.push("");
  }

  // 締めの挨拶
  if (guideData?.interviewer_guide?.closing_script) {
    lines.push("■ 締めの挨拶テンプレート");
    lines.push(`「${guideData.interviewer_guide.closing_script}」`);
    lines.push("");
  }

  // インタビュー後
  if (guideData?.post_interview?.immediate_actions) {
    lines.push("■ インタビュー直後にやること");
    (guideData.post_interview.immediate_actions as string[]).forEach((action: string) => {
      lines.push(`  □ ${action}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}
