"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Camera,
  FileText,
  Store,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Megaphone,
  Image,
  Share2,
  BookOpen,
  Mail,
  Bot,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EMPATHY_TAGS } from "@/lib/constants";

type WeeklyTrend = { thisWeek: number; lastWeek: number };

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

type DashboardData = {
  shop: { name: string; owner_name: string; id?: string } | null;
  kpi: {
    oshi_count: number;
    empathy_count: number;
    visit_count: number;
    letter_count: number;
    unread_letter_count: number;
  };
  weeklyTrends: {
    oshi: WeeklyTrend;
    empathy: WeeklyTrend;
    visits: WeeklyTrend;
    letters: WeeklyTrend;
  };
  recentEmpathy: {
    id: string;
    nickname: string;
    tagId: string;
    storyTitle: string;
    time: string;
  }[];
  tagDistribution: { tagId: string; count: number }[];
  setupTasks: {
    profile: boolean;
    interview: boolean;
    story_review: boolean;
    photo: boolean;
  };
};

function getEmpathyTag(tagId: string) {
  return EMPATHY_TAGS.find((t) => t.id === tagId);
}

function TrendIndicator({ trend }: { trend?: WeeklyTrend }) {
  if (!trend) return null;
  const { thisWeek, lastWeek } = trend;
  if (thisWeek === lastWeek) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>±0</span>
      </span>
    );
  }
  const diff = thisWeek - lastWeek;
  const isUp = diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs ${isUp ? "text-green-600" : "text-orange-500"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{isUp ? "+" : ""}{diff} 今週</span>
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  badge,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: WeeklyTrend;
  badge?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <div className="mt-1.5 flex items-end gap-2">
          <span className="text-2xl font-bold leading-none">{value}</span>
          {badge && (
            <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700">
              {badge}
            </Badge>
          )}
        </div>
        <div className="mt-1.5">
          <TrendIndicator trend={trend} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cmProposals, setCmProposals] = useState<CMProposalData[]>([]);
  const [cmPendingCount, setCmPendingCount] = useState(0);

  // CM提案のアクション処理
  const handleProposalAction = async (proposalId: string, action: "accept" | "dismiss") => {
    try {
      const res = await fetch("/api/cm-proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal_id: proposalId, action }),
      });
      if (res.ok) {
        setCmProposals((prev) => prev.filter((p) => p.id !== proposalId));
        setCmPendingCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // エラーは無視（UIは変わらない）
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/home");
        if (res.status === 401) {
          setError("ログインが必要です");
          setIsLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const json = await res.json();
        setData(json);

        // CM提案を取得
        if (json.shop?.id) {
          try {
            const cmRes = await fetch(`/api/cm-proposals?shop_id=${json.shop.id}&status=pending&limit=5`);
            if (cmRes.ok) {
              const cmData = await cmRes.json();
              setCmProposals(cmData.proposals ?? []);
              setCmPendingCount(cmData.pending_count ?? 0);
            }
          } catch {
            // CM提案の取得失敗は無視
          }
        }
      } catch {
        setError("データの読み込みに失敗しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        {error === "ログインが必要です" && (
          <Button asChild>
            <Link href="/login">ログインする</Link>
          </Button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const { shop, kpi, weeklyTrends, recentEmpathy, tagDistribution, setupTasks } = data;

  // 店舗未登録の場合
  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
        </div>
        <Card className="border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-bold">お店を登録しましょう</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              まずはお店の基本情報を登録して、オシドリでストーリーを発信しましょう。
              <br />
              登録は数分で完了します。
            </p>
            <Button asChild size="lg" className="mt-6 gap-2">
              <Link href="/dashboard/shop">
                <Sparkles className="h-4 w-4" />
                店舗情報を登録する
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const SETUP_TASK_LIST = [
    {
      id: "profile",
      label: "店舗プロフィールを入力",
      description: "お店の基本情報を登録しましょう",
      icon: Store,
      href: "/dashboard/shop",
      completed: setupTasks.profile,
    },
    {
      id: "interview",
      label: "AIインタビューを受ける",
      description: "ナオがあなたのお店の魅力を引き出します",
      icon: Sparkles,
      href: "/dashboard/interview",
      completed: setupTasks.interview,
    },
    {
      id: "story_review",
      label: "ストーリーを確認・公開",
      description: "生成されたストーリーを確認して公開しましょう",
      icon: FileText,
      href: "/dashboard/stories",
      completed: setupTasks.story_review,
    },
    {
      id: "photo",
      label: "写真をアップロード",
      description: "撮影リクエストに沿って写真を追加しましょう",
      icon: Camera,
      href: "/dashboard/stories",
      completed: setupTasks.photo,
    },
  ];

  const maxTagCount = tagDistribution.length > 0
    ? Math.max(...tagDistribution.map((t) => t.count))
    : 1;

  const completedTasks = SETUP_TASK_LIST.filter((t) => t.completed).length;
  const hasIncompleteTasks = completedTasks < SETUP_TASK_LIST.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        {shop && (
          <p className="mt-1 text-sm text-muted-foreground">
            {shop.name}
          </p>
        )}
      </div>

      {/* セットアップ タスクリスト */}
      {hasIncompleteTasks && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">はじめにやること</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {completedTasks} / {SETUP_TASK_LIST.length} 完了
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-bold text-primary">
                  {Math.round((completedTasks / SETUP_TASK_LIST.length) * 100)}%
                </span>
              </div>
            </div>

            {/* 進捗バー */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${(completedTasks / SETUP_TASK_LIST.length) * 100}%`,
                }}
              />
            </div>

            {/* タスク一覧 */}
            <div className="mt-4 space-y-2">
              {SETUP_TASK_LIST.filter((task) => {
                // S-08: 未完了タスクは最大2件まで表示、完了タスクは非表示
                if (task.completed) return false;
                const incompleteTasks = SETUP_TASK_LIST.filter(t => !t.completed);
                return incompleteTasks.indexOf(task) < 2;
              }).map((task) => {
                const isNext =
                  !task.completed &&
                  SETUP_TASK_LIST.findIndex((t) => !t.completed) ===
                    SETUP_TASK_LIST.indexOf(task);
                return (
                  <Link
                    key={task.id}
                    href={task.href}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      task.completed
                        ? "border-transparent bg-muted/30 opacity-60"
                        : isNext
                          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                          : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                    ) : (
                      <Circle
                        className={`h-5 w-5 shrink-0 ${isNext ? "text-primary" : "text-muted-foreground"}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${task.completed ? "line-through" : ""}`}
                      >
                        {task.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                    {isNext && (
                      <Button size="sm" className="shrink-0">
                        始める
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                    {task.completed && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px]"
                      >
                        完了
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIカード */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="推し登録"
          value={kpi.oshi_count}
          icon={Heart}
          trend={weeklyTrends?.oshi}
        />
        <KpiCard
          label="共感タップ"
          value={kpi.empathy_count}
          icon={MessageCircle}
          trend={weeklyTrends?.empathy}
        />
        <KpiCard
          label="来店記録"
          value={kpi.visit_count}
          icon={BookOpen}
          trend={weeklyTrends?.visits}
        />
        <KpiCard
          label="ファンレター"
          value={kpi.letter_count}
          icon={Mail}
          trend={weeklyTrends?.letters}
          badge={kpi.unread_letter_count > 0 ? `${kpi.unread_letter_count}件未読` : undefined}
        />
      </div>

      {/* 今週のハイライト */}
      {weeklyTrends && (() => {
        const highlights: { icon: React.ComponentType<{ className?: string }>; text: string; positive: boolean }[] = [];
        const oshi = weeklyTrends.oshi;
        const empathy = weeklyTrends.empathy;
        const visits = weeklyTrends.visits;
        const letters = weeklyTrends.letters;
        if (oshi.thisWeek > oshi.lastWeek) {
          highlights.push({ icon: Heart, text: `推し登録が先週より${oshi.thisWeek - oshi.lastWeek}件増えました`, positive: true });
        }
        if (empathy.thisWeek > empathy.lastWeek) {
          highlights.push({ icon: MessageCircle, text: `共感タップが先週より${empathy.thisWeek - empathy.lastWeek}件増えました`, positive: true });
        }
        if (visits.thisWeek > 0) {
          highlights.push({ icon: BookOpen, text: `今週${visits.thisWeek}件の来店記録が届きました`, positive: true });
        }
        if (letters.thisWeek > 0) {
          highlights.push({ icon: Mail, text: `今週${letters.thisWeek}件のファンレターを受け取りました`, positive: true });
        }
        if (kpi.unread_letter_count > 0) {
          highlights.push({ icon: Mail, text: `未読のファンレターが${kpi.unread_letter_count}件あります`, positive: false });
        }
        if (highlights.length === 0) return null;
        return (
          <Card className="border-blue-200/60 bg-gradient-to-r from-blue-50/40 to-indigo-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-blue-900">今週のハイライト</h2>
              </div>
              <div className="space-y-2">
                {highlights.slice(0, 4).map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <h.icon className={`h-4 w-4 shrink-0 ${h.positive ? "text-green-600" : "text-orange-500"}`} />
                    <span className="text-[#2C3E50]">{h.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* AI CM提案ウィジェット */}
      {cmProposals.length > 0 && (
        <Card className="border-purple-200/60 bg-gradient-to-r from-purple-50/40 to-violet-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-purple-900">AIからの提案</h2>
                {cmPendingCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700">
                    {cmPendingCount}件
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {cmProposals.slice(0, 3).map((proposal) => (
                <div
                  key={proposal.id}
                  className="rounded-lg border border-white/80 bg-white/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {proposal.priority === "high" && (
                          <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                            優先
                          </Badge>
                        )}
                        <p className="text-sm font-medium">{proposal.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {proposal.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleProposalAction(proposal.id, "accept")}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
                        title="採用する"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleProposalAction(proposal.id, "dismiss")}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                        title="却下する"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {proposal.suggested_message && (
                    <div className="mt-2 rounded bg-purple-50/50 p-2">
                      <p className="text-xs text-purple-800 line-clamp-2">
                        &quot;{proposal.suggested_message}&quot;
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* おすすめアクション */}
      {!hasIncompleteTasks && (
        <Card className="border-primary/20 bg-gradient-to-r from-orange-50/50 to-amber-50/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">おすすめアクション</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/dashboard/updates"
                className="flex items-center gap-3 rounded-lg border border-white/80 bg-white/60 p-3 text-sm transition-colors hover:bg-white"
              >
                <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">近況を更新しよう</p>
                  <p className="text-xs text-muted-foreground">お店の最新情報をファンに届けましょう</p>
                </div>
              </Link>
              <Link
                href="/dashboard/photos"
                className="flex items-center gap-3 rounded-lg border border-white/80 bg-white/60 p-3 text-sm transition-colors hover:bg-white"
              >
                <Image className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">写真を追加しよう</p>
                  <p className="text-xs text-muted-foreground">魅力的な写真でファンを増やしましょう</p>
                </div>
              </Link>
              <Link
                href="/dashboard/messages"
                className="flex items-center gap-3 rounded-lg border border-white/80 bg-white/60 p-3 text-sm transition-colors hover:bg-white"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">メッセージを送ろう</p>
                  <p className="text-xs text-muted-foreground">ファンにお礼や近況を届けましょう</p>
                </div>
              </Link>
              <Link
                href="/dashboard/sns-hub"
                className="flex items-center gap-3 rounded-lg border border-white/80 bg-white/60 p-3 text-sm transition-colors hover:bg-white"
              >
                <Share2 className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">SNSで発信しよう</p>
                  <p className="text-xs text-muted-foreground">ストーリーをSNSで広めましょう</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 最近の共感タップ */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold">最近の共感タップ</h2>
            {recentEmpathy.length > 0 ? (
              <div className="mt-4 space-y-3">
                {recentEmpathy.map((item) => {
                  const tag = getEmpathyTag(item.tagId);
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg">
                        {tag?.emoji ?? "👏"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <strong>{item.nickname}</strong>さんが
                          <span className="rounded-sm bg-primary/10 px-1 text-primary">
                            &quot;{tag?.label ?? item.tagId}&quot;
                          </span>
                          と共感しました
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.storyTitle}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                まだ共感タップがありません。ストーリーを公開するとファンからの共感が届きます。
              </p>
            )}
          </CardContent>
        </Card>

        {/* 感情タグの分布 */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold">感情タグの分布</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              どの想いに共感が集まっているか
            </p>
            {tagDistribution.length > 0 ? (
              <div className="mt-4 space-y-3">
                {tagDistribution.map((item) => {
                  const tag = getEmpathyTag(item.tagId);
                  return (
                    <div key={item.tagId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <span>{tag?.emoji ?? "👏"}</span>
                          {tag?.label ?? item.tagId}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {item.count}
                        </Badge>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all"
                          style={{
                            width: `${(item.count / maxTagCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                共感タップのデータが蓄積されると分布が表示されます。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
