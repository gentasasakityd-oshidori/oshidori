"use client";

import { useState, useEffect } from "react";
import { BarChart3, Filter, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPATHY_TAGS, AREAS, CATEGORIES } from "@/lib/constants";

type AnalysisData = {
  empathy_tag_counts: Record<string, number>;
  empathy_total: number;
  theme_score_averages: Record<string, number>;
  theme_sample_size: number;
  available_areas: string[];
  available_categories: string[];
};

const THEME_LABELS: Record<string, string> = {
  origin: "原点・きっかけ",
  food_craft: "食材・調理",
  hospitality: "接客・おもてなし",
  community: "コミュニティ",
  personality: "人柄",
  local_connection: "街とのつながり",
  vision: "未来への想い",
};

export default function EmpathyAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (area) params.set("area", area);
      if (category) params.set("category", category);
      const res = await fetch(`/api/admin/empathy-analysis?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [area, category]);

  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!data) {
    return <p className="py-12 text-center text-muted-foreground">データの取得に失敗しました</p>;
  }

  // 共感タグの最大値（バー表示用）
  const maxTagCount = Math.max(1, ...Object.values(data.empathy_tag_counts));
  // テーマスコアの最大値
  const maxThemeScore = Math.max(1, ...Object.values(data.theme_score_averages));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">テーマ別共感分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          エリア×業態ごとの共感傾向を可視化します（Step 4-1 / 4-2）
        </p>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">エリア</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="rounded border px-3 py-1.5 text-sm"
            >
              <option value="">すべて</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">カテゴリ</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border px-3 py-1.5 text-sm"
            >
              <option value="">すべて</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            共感タップ: {data.empathy_total}件
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 共感タグ分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              共感タグ分布
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EMPATHY_TAGS.map((tag) => {
              const count = data.empathy_tag_counts[tag.id] ?? 0;
              const pct = maxTagCount > 0 ? (count / maxTagCount) * 100 : 0;
              return (
                <div key={tag.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>
                      {tag.emoji} {tag.label}
                    </span>
                    <span className="font-medium">{count}件</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {data.empathy_total === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                データがありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* ストーリーテーマスコア（レーダーチャート代替の棒グラフ） */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              ストーリーテーマスコア
              <span className="text-xs font-normal text-muted-foreground">
                (n={data.theme_sample_size})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(THEME_LABELS).map(([key, label]) => {
              const score = data.theme_score_averages[key] ?? 0;
              const pct = maxThemeScore > 0 ? (score / 10) * 100 : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium">{score}/10</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-orange-400/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {data.theme_sample_size === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                データがありません
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
