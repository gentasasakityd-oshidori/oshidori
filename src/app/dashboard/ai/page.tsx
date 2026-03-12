"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mic,
  Bot,
  ChevronRight,
  Check,
  X,
  Sparkles,
  FileText,
  Camera,
  MessageCircle,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  ClipboardEdit,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type CMProposalData = {
  id: string;
  proposal_type: string;
  title: string;
  description: string;
  suggested_action: string;
  suggested_message?: string;
  priority: "high" | "normal" | "low";
  status: string;
  created_at: string;
};

type ShopInfo = {
  id: string;
  name: string;
  onboarding_phase: string | null;
  has_completed_interview: boolean;
  has_published_story: boolean;
  has_photo_request: boolean;
};

export default function AIPage() {
  const [proposals, setProposals] = useState<CMProposalData[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // ダッシュボードAPIから店舗情報を取得
        const homeRes = await fetch("/api/dashboard/home");
        if (!homeRes.ok) return;
        const homeData = await homeRes.json();

        if (!homeData.shop) return;

        setShopInfo({
          id: homeData.shop.id || "",
          name: homeData.shop.name || "",
          onboarding_phase: homeData.shop.onboarding_phase || null,
          has_completed_interview: homeData.setupTasks?.interview || false,
          has_published_story: homeData.setupTasks?.story_review || false,
          has_photo_request: homeData.setupTasks?.photo || false,
        });

        // CM提案を取得
        if (homeData.shop.id) {
          const cmRes = await fetch(`/api/cm-proposals?shop_id=${homeData.shop.id}&limit=20`);
          if (cmRes.ok) {
            const cmData = await cmRes.json();
            setProposals(cmData.proposals ?? []);
            setPendingCount(cmData.pending_count ?? 0);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleProposalAction = async (proposalId: string, action: "accept" | "dismiss") => {
    try {
      const res = await fetch("/api/cm-proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal_id: proposalId, action }),
      });
      if (res.ok) {
        setProposals((prev) => prev.filter((p) => p.id !== proposalId));
        setPendingCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const processedProposals = proposals.filter((p) => p.status !== "pending");

  // インタビュー未実施 = 初回ユーザー
  const isFirstTime = shopInfo && !shopInfo.has_completed_interview;
  // オンボーディング中
  const isOnboarding = shopInfo?.onboarding_phase && shopInfo.onboarding_phase !== "published";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI機能
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AIがあなたのお店の魅力を引き出し、発信をサポートします
        </p>
      </div>

      {/* ━━━ 初回ユーザー向けウェルカムガイド ━━━ */}
      {isFirstTime && (
        <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/60 to-indigo-50/40">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl">
                🎤
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-blue-900">
                  まずはAIインタビューを受けましょう！
                </h2>
                <p className="mt-1.5 text-sm text-blue-800/80 leading-relaxed">
                  AIインタビュアー「ナオ」が、あなたのお店の魅力や想いを会話形式で引き出します。
                  インタビューが完了すると、<strong>ストーリー</strong>・<strong>おすすめメニュー</strong>・<strong>撮影リクエスト</strong>が自動生成されます。
                </p>

                {/* インタビューで生成されるもの */}
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">ストーリー</p>
                      <p className="text-[10px] text-blue-700/60">お店の魅力を記事化</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">メニュー紹介</p>
                      <p className="text-[10px] text-blue-700/60">こだわりを言語化</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
                    <Camera className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">撮影リクエスト</p>
                      <p className="text-[10px] text-blue-700/60">必要な写真をリスト化</p>
                    </div>
                  </div>
                </div>

                {/* 所要時間と準備 */}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-blue-700/70">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    所要時間：約30〜50分
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    テキスト入力 or 音声入力
                  </span>
                </div>

                <Button asChild size="lg" className="mt-5 gap-2 w-full sm:w-auto">
                  <Link href="/dashboard/interview">
                    <Mic className="h-4 w-4" />
                    AIインタビューを始める
                  </Link>
                </Button>
              </div>
            </div>

            {/* FAQ折りたたみ */}
            <button
              onClick={() => setShowFaq(!showFaq)}
              className="mt-4 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {showFaq ? "閉じる" : "よくある質問を見る"}
            </button>
            {showFaq && (
              <div className="mt-3 space-y-2.5 border-t border-blue-200/50 pt-3">
                <FaqItem
                  q="何を聞かれますか？"
                  a="お店のコンセプト、おすすめメニュー、お店を始めたきっかけ、お客さんとの思い出などを自然な会話で聞きます。構えなくて大丈夫です！"
                />
                <FaqItem
                  q="途中でやめられますか？"
                  a="はい、いつでも一時停止できます。次回アクセス時に続きから再開できます。"
                />
                <FaqItem
                  q="事前に準備は必要ですか？"
                  a="特別な準備は不要ですが、おすすめメニュー3品を考えておくとスムーズです。"
                />
                <FaqItem
                  q="生成されたコンテンツは編集できますか？"
                  a="はい、AIが生成した内容は「コンテンツ」ページで自由に編集・公開できます。"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ━━━ インタビュー完了済みユーザー向け ━━━ */}
      {shopInfo && !isFirstTime && (
        <>
          {/* オンボーディング進捗サマリー */}
          {isOnboarding && (
            <Card className="border-green-200/60 bg-gradient-to-r from-green-50/40 to-emerald-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  <h2 className="text-sm font-semibold text-green-900">次のステップ</h2>
                </div>
                <div className="space-y-2">
                  <StepItem
                    completed={shopInfo.has_completed_interview}
                    label="AIインタビューを受ける"
                    description="お店の魅力を引き出すインタビュー"
                    href="/dashboard/interview"
                  />
                  <StepItem
                    completed={shopInfo.has_published_story}
                    label="ストーリーを確認・公開する"
                    description="生成されたストーリーの確認と公開"
                    href="/dashboard/stories"
                  />
                  <StepItem
                    completed={shopInfo.has_photo_request}
                    label="写真をアップロードする"
                    description="撮影リクエストに沿って写真を追加"
                    href="/dashboard/photos"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI機能カード群 */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* AIインタビュー */}
            <Link href="/dashboard/interview" className="group block">
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
                      🎤
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#2C3E50] group-hover:text-primary transition-colors">
                        AIインタビュー
                      </h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        月次アップデート・メニュー追加など
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* AI日報 */}
            <Link href="/dashboard/daily-report" className="group block">
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">
                      📝
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#2C3E50] group-hover:text-primary transition-colors">
                        AI日報
                      </h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        会話で近況更新・在庫速報・SNS文を自動生成
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}

      {/* ━━━ AI提案セクション ━━━ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-4 w-4 text-purple-600" />
          <h2 className="text-base font-semibold">AI提案</h2>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700">
              {pendingCount}件
            </Badge>
          )}
        </div>

        {pendingProposals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Bot className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                現在、新しい提案はありません
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isFirstTime
                  ? "インタビュー完了後、AIが最適なアクションを提案します"
                  : "データが蓄積されるとAIが最適なアクションを提案します"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingProposals.map((proposal) => (
              <Card key={proposal.id} className="border-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {proposal.priority === "high" && (
                          <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                            優先
                          </Badge>
                        )}
                        <p className="text-sm font-medium">{proposal.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {proposal.description}
                      </p>
                      {proposal.suggested_message && (
                        <div className="mt-2 rounded bg-purple-50/50 p-2">
                          <p className="text-xs text-purple-800 line-clamp-2">
                            &quot;{proposal.suggested_message}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => handleProposalAction(proposal.id, "accept")}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
                        title="採用する"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProposalAction(proposal.id, "dismiss")}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                        title="却下する"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 処理済み提案の履歴 */}
      {processedProposals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">提案履歴</h2>
          <div className="space-y-1.5">
            {processedProposals.slice(0, 10).map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-sm"
              >
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  proposal.status === "accepted"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {proposal.status === "accepted" ? "承認" : "却下"}
                </span>
                <span className="text-[#2C3E50] truncate flex-1">{proposal.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(proposal.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** FAQアイテムコンポーネント */
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-lg bg-white/50 p-3">
      <p className="text-xs font-medium text-blue-900">Q. {q}</p>
      <p className="mt-1 text-xs text-blue-700/70">{a}</p>
    </div>
  );
}

/** ステップアイテムコンポーネント */
function StepItem({
  completed,
  label,
  description,
  href,
}: {
  completed: boolean;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        completed
          ? "border-green-200 bg-green-50/30"
          : "border-white/80 bg-white/60 hover:bg-white"
      }`}
    >
      {completed ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${completed ? "text-green-800" : ""}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {!completed && (
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      )}
    </Link>
  );
}
