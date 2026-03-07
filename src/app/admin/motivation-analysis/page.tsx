"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, TrendingUp, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPATHY_TAGS } from "@/lib/constants";

type KeywordItem = { word: string; count: number };
type ReasonItem = { text: string; date: string };
type CommentItem = { tag_type: string; text: string; date: string };
type MonthlyItem = { month: string; total: number; with_reason: number; rate: number };

type AnalysisData = {
  push_reason: {
    total_oshi: number;
    with_reason: number;
    rate: number;
    top_keywords: KeywordItem[];
    recent_reasons: ReasonItem[];
  };
  empathy_comments: {
    total_empathy: number;
    with_comment: number;
    rate: number;
    top_keywords: KeywordItem[];
    recent_comments: CommentItem[];
  };
  monthly_trend: MonthlyItem[];
};

export default function MotivationAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/motivation-analysis");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!data) {
    return <p className="py-12 text-center text-muted-foreground">データの取得に失敗しました</p>;
  }

  const tagLabelMap = new Map<string, string>(EMPATHY_TAGS.map((t) => [t.id as string, `${t.emoji} ${t.label}`]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">動機データ分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          推しポイント・共感ひと言の集計とキーワード分析（Step 4-6）
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              推し登録数
            </div>
            <p className="mt-1 text-2xl font-bold">{data.push_reason.total_oshi}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              推しポイント入力率
            </div>
            <p className="mt-1 text-2xl font-bold">{data.push_reason.rate}%</p>
            <p className="text-xs text-muted-foreground">
              {data.push_reason.with_reason}/{data.push_reason.total_oshi}件
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              共感タップ数
            </div>
            <p className="mt-1 text-2xl font-bold">{data.empathy_comments.total_empathy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              ひと言入力率
            </div>
            <p className="mt-1 text-2xl font-bold">{data.empathy_comments.rate}%</p>
            <p className="text-xs text-muted-foreground">
              {data.empathy_comments.with_comment}/{data.empathy_comments.total_empathy}件
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 応援ポイントキーワード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">推しポイント 頻出キーワード</CardTitle>
          </CardHeader>
          <CardContent>
            {data.push_reason.top_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.push_reason.top_keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm"
                    style={{
                      fontSize: `${Math.max(12, Math.min(20, 12 + kw.count * 2))}px`,
                    }}
                  >
                    {kw.word}
                    <span className="text-xs text-muted-foreground">({kw.count})</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                データがありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* 共感ひと言キーワード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">共感ひと言 頻出キーワード</CardTitle>
          </CardHeader>
          <CardContent>
            {data.empathy_comments.top_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.empathy_comments.top_keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm"
                    style={{
                      fontSize: `${Math.max(12, Math.min(20, 12 + kw.count * 2))}px`,
                    }}
                  >
                    {kw.word}
                    <span className="text-xs text-muted-foreground">({kw.count})</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                データがありません
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近の推しポイント */}
      {data.push_reason.recent_reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">最近の推しポイント</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.push_reason.recent_reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                  <Heart className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
                  <div className="flex-1">
                    <p className="text-sm">{r.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最近の共感ひと言 */}
      {data.empathy_comments.recent_comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">最近の共感ひと言</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.empathy_comments.recent_comments.map((c, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                  <span className="mt-0.5 shrink-0 text-sm">
                    {tagLabelMap.get(c.tag_type) ?? c.tag_type}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">{c.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(c.date).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 月別推移 */}
      {data.monthly_trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">月別推しポイント入力率推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">月</th>
                    <th className="pb-2 pr-4">登録数</th>
                    <th className="pb-2 pr-4">入力あり</th>
                    <th className="pb-2">入力率</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly_trend.map((m) => (
                    <tr key={m.month} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{m.month}</td>
                      <td className="py-2 pr-4">{m.total}</td>
                      <td className="py-2 pr-4">{m.with_reason}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${m.rate}%` }}
                            />
                          </div>
                          <span>{m.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
