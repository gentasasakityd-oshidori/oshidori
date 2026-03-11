"use client";

import { useState, useEffect } from "react";
import { BarChart3, Heart, Mic, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TabKey = "user-behavior" | "content-quality" | "trends";

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("user-behavior");
  const [empathyData, setEmpathyData] = useState<{
    empathy_tag_counts: Record<string, number>;
    empathy_total: number;
    theme_score_averages: Record<string, number>;
    theme_sample_size: number;
  } | null>(null);
  const [interviewData, setInterviewData] = useState<{
    total_completed: number;
    avg_total_messages: number;
    avg_duration_minutes: number;
    phase_stats: { phase: number; name: string; avg_messages: number; avg_duration_minutes: number; sample_size: number }[];
  } | null>(null);
  const [motivationData, setMotivationData] = useState<{
    push_reason: {
      total_oshi: number;
      with_reason: number;
      rate: number;
      top_keywords: { word: string; count: number }[];
      recent_reasons: { text: string; date: string }[];
    };
    empathy_comments: {
      total_empathy: number;
      with_comment: number;
      rate: number;
      top_keywords: { word: string; count: number }[];
    };
    monthly_trend: { month: string; total: number; with_reason: number; rate: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [emp, intv, mot] = await Promise.all([
        fetch("/api/admin/empathy-analysis").then((r) => r.ok ? r.json() : null),
        fetch("/api/admin/interview-analysis").then((r) => r.ok ? r.json() : null),
        fetch("/api/admin/motivation-analysis").then((r) => r.ok ? r.json() : null),
      ]);
      setEmpathyData(emp);
      setInterviewData(intv);
      setMotivationData(mot);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const TABS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: "user-behavior", label: "ユーザー行動", icon: Heart },
    { key: "content-quality", label: "コンテンツ品質", icon: Mic },
    { key: "trends", label: "トレンド", icon: TrendingUp },
  ];

  const THEME_LABELS: Record<string, string> = {
    origin: "原点の物語",
    food_craft: "食のこだわり",
    hospitality: "おもてなし",
    community: "地域との繋がり",
    personality: "人柄",
    local_connection: "ローカル接続",
    vision: "ビジョン",
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">分析ダッシュボード</h1>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ユーザー行動タブ */}
      {activeTab === "user-behavior" && (
        <div className="space-y-4">
          {/* KPI */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">共感タップ総数</p>
                <p className="text-2xl font-bold">{empathyData?.empathy_total ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">推し登録数</p>
                <p className="text-2xl font-bold">{motivationData?.push_reason.total_oshi ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">応援理由入力率</p>
                <p className="text-2xl font-bold">{motivationData?.push_reason.rate ?? 0}%</p>
              </CardContent>
            </Card>
          </div>

          {/* 共感タグ分布 */}
          {empathyData && Object.keys(empathyData.empathy_tag_counts).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">共感タグ分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(empathyData.empathy_tag_counts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tag, count]) => {
                      const maxCount = Math.max(...Object.values(empathyData.empathy_tag_counts));
                      const pct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={tag} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 truncate text-sm">{tag}</span>
                          <div className="flex-1 h-5 rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-pink-400/70" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right text-sm font-medium">{count}</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 応援ポイント キーワード */}
          {motivationData && motivationData.push_reason.top_keywords.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">応援ポイント頻出キーワード</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {motivationData.push_reason.top_keywords.slice(0, 20).map((kw) => (
                    <Badge key={kw.word} variant="outline" className="text-sm">
                      {kw.word} ({kw.count})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* コンテンツ品質タブ */}
      {activeTab === "content-quality" && (
        <div className="space-y-4">
          {/* KPI */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">完了インタビュー数</p>
                <p className="text-2xl font-bold">{interviewData?.total_completed ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">平均メッセージ数</p>
                <p className="text-2xl font-bold">{interviewData?.avg_total_messages ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">平均所要時間</p>
                <p className="text-2xl font-bold">{interviewData?.avg_duration_minutes ?? 0}分</p>
              </CardContent>
            </Card>
          </div>

          {/* フェーズ別統計 */}
          {interviewData && interviewData.phase_stats.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">フェーズ別分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {interviewData.phase_stats.map((stat) => (
                    <div key={stat.phase} className="flex items-center gap-4 py-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {stat.phase}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{stat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          平均{stat.avg_messages}メッセージ / {stat.avg_duration_minutes}分
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        n={stat.sample_size}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ストーリーテーマスコア */}
          {empathyData && empathyData.theme_sample_size > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">ストーリーテーマスコア平均</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(empathyData.theme_score_averages)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, avg]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-sm">{THEME_LABELS[key] || key}</span>
                        <div className="flex-1 h-4 rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-indigo-400/70" style={{ width: `${Math.min(avg * 10, 100)}%` }} />
                        </div>
                        <span className="w-8 text-right text-sm font-medium">{avg}</span>
                      </div>
                    ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">サンプル数: {empathyData.theme_sample_size}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* トレンドタブ */}
      {activeTab === "trends" && (
        <div className="space-y-4">
          {motivationData && motivationData.monthly_trend.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">月別推し登録推移</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {motivationData.monthly_trend.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-sm">{m.month}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-4 rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${Math.min((m.total / Math.max(...motivationData.monthly_trend.map(t => t.total))) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-sm">{m.total}件</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        理由{m.rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-muted-foreground">トレンドデータはまだありません</p>
          )}
        </div>
      )}
    </div>
  );
}
