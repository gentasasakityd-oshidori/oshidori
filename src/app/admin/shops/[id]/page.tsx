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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  PHASE_METADATA,
  ONBOARDING_PHASES,
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

type TabKey = "info" | "application" | "onboarding";

export default function AdminShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ShopDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

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

  useEffect(() => {
    load();
  }, [load]);

  const handleOnboardingAction = async (action: string, extraData?: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      await fetch(`/api/admin/onboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData }),
      });
      await load();
    } catch {
      // Ignore
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
  };
  const phaseProgress = (() => {
    const idx = ONBOARDING_PHASES.indexOf(phase as OnboardingPhase);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / ONBOARDING_PHASES.length) * 100);
  })();

  const TABS: { key: TabKey; label: string }[] = [
    { key: "info", label: "基本情報" },
    { key: "application", label: "申請管理" },
    { key: "onboarding", label: "オンボーディング" },
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
              {phaseInfo.shortLabel}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {shop.owner_name} / {shop.area} / {shop.category}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            登録日: {new Date(shop.created_at).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shops/${shop.slug}`} target="_blank">
            <ExternalLink className="mr-1 h-3 w-3" />
            店舗ページ
          </Link>
        </Button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
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
                  <div><span className="text-muted-foreground">ステータス:</span> {data.application.status}</div>
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
                      <Button size="sm" disabled={actionLoading}>
                        <CheckCircle2 className="mr-1 h-4 w-4" />承認
                      </Button>
                      <Button size="sm" variant="outline" disabled={actionLoading}>
                        <XCircle className="mr-1 h-4 w-4" />却下
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                この店舗は直接登録されたため、申請情報はありません
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* オンボーディングタブ */}
      {activeTab === "onboarding" && (
        <div className="space-y-4">
          {/* 進捗バー */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">オンボーディング進捗</span>
                <Badge variant="outline" className={`border-0 ${phaseInfo.color} ${phaseInfo.textColor}`}>
                  {phaseInfo.label}
                </Badge>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${phaseProgress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{phaseInfo.description}</p>
            </CardContent>
          </Card>

          {/* フェーズ別ステータス */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">フェーズ履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ONBOARDING_PHASES.filter(p => p !== "pipeline_error").map((p) => {
                  const info = PHASE_METADATA[p];
                  const idx = ONBOARDING_PHASES.indexOf(p);
                  const currentIdx = ONBOARDING_PHASES.indexOf(phase as OnboardingPhase);
                  const isCompleted = idx < currentIdx;
                  const isCurrent = p === phase;

                  return (
                    <div key={p} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isCompleted ? "bg-green-100 text-green-700" : isCurrent ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-400"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`text-sm ${isCurrent ? "font-medium text-primary" : isCompleted ? "text-gray-700" : "text-gray-400"}`}>
                        {info.label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{info.actor === "ai" ? "AI" : info.actor === "cs" ? "CS" : info.actor === "owner" ? "オーナー" : ""}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* エラー時の再実行 */}
          {phase === "pipeline_error" && (
            <Card className="border-red-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-600 mb-3">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">パイプラインエラー</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">自動処理でエラーが発生しました。再実行ボタンを押して復旧してください。</p>
                <Button
                  size="sm"
                  onClick={() => handleOnboardingAction("retry_pipeline")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  パイプライン再実行
                </Button>
              </CardContent>
            </Card>
          )}

          {/* アクションボタン */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                アクション
                <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
                  <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(phase === "approved" || phase === "pipeline_error") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOnboardingAction("retry_pipeline")}
                    disabled={actionLoading}
                  >
                    <Play className="h-3 w-3 mr-1" />事前調査開始
                  </Button>
                )}
                {phase === "ready_for_interview" && (
                  <Button
                    size="sm"
                    onClick={() => handleOnboardingAction("assign_interviewer", { interviewer_id: "self" })}
                    disabled={actionLoading}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />インタビュアー割当
                  </Button>
                )}
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
