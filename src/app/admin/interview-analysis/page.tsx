"use client";

import { useState, useEffect } from "react";
import { Mic, Clock, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PhaseStats = {
  phase: number;
  name: string;
  avg_messages: number;
  avg_user_chars: number;
  avg_assistant_chars: number;
  avg_duration_minutes: number;
  sample_size: number;
};

type InterviewSummary = {
  id: string;
  shop_name: string;
  total_messages: number;
  user_messages: number;
  total_user_chars: number;
  created_at: string;
  completed_at: string;
};

type AnalysisData = {
  total_completed: number;
  phase_stats: PhaseStats[];
  avg_total_messages: number;
  avg_duration_minutes: number;
  interviews: InterviewSummary[];
};

const PHASE_COLORS = [
  "bg-blue-400",
  "bg-green-400",
  "bg-yellow-400",
  "bg-orange-400",
  "bg-pink-400",
  "bg-purple-400",
];

export default function InterviewAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/interview-analysis");
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

  const maxMessages = Math.max(1, ...data.phase_stats.map((p) => p.avg_messages));
  const maxDuration = Math.max(1, ...data.phase_stats.map((p) => p.avg_duration_minutes));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">フェーズ別インタビュー分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          6フェーズごとの所要時間・発話量を分析します（Step 4-3）
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="h-4 w-4" />
              完了インタビュー
            </div>
            <p className="mt-1 text-2xl font-bold">{data.total_completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              平均メッセージ数
            </div>
            <p className="mt-1 text-2xl font-bold">{data.avg_total_messages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              平均所要時間
            </div>
            <p className="mt-1 text-2xl font-bold">{data.avg_duration_minutes}分</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              分析対象
            </div>
            <p className="mt-1 text-2xl font-bold">{data.total_completed}件</p>
          </CardContent>
        </Card>
      </div>

      {/* フェーズ別統計 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">フェーズ別メッセージ数</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.phase_stats.map((phase, idx) => (
            <div key={phase.phase}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {phase.phase}. {phase.name}
                </span>
                <span className="text-muted-foreground">
                  平均 {phase.avg_messages} メッセージ / {phase.avg_duration_minutes}分
                </span>
              </div>
              <div className="flex gap-1">
                <div className="flex-1">
                  <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${PHASE_COLORS[idx]} transition-all`}
                      style={{
                        width: `${(phase.avg_messages / maxMessages) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                <span>店主平均: {phase.avg_user_chars}文字</span>
                <span>AI平均: {phase.avg_assistant_chars}文字</span>
                <span>(n={phase.sample_size})</span>
              </div>
            </div>
          ))}

          {data.total_completed === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              完了したインタビューがありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* フェーズ別所要時間 */}
      {data.total_completed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">フェーズ別所要時間</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.phase_stats.map((phase, idx) => (
              <div key={phase.phase}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {phase.phase}. {phase.name}
                  </span>
                  <span className="text-muted-foreground">
                    {phase.avg_duration_minutes}分
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${PHASE_COLORS[idx]} opacity-60 transition-all`}
                    style={{
                      width: `${maxDuration > 0 ? (phase.avg_duration_minutes / maxDuration) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* インタビュー一覧 */}
      {data.interviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">インタビュー詳細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">店舗名</th>
                    <th className="pb-2 pr-4">メッセージ</th>
                    <th className="pb-2 pr-4">店主発話</th>
                    <th className="pb-2 pr-4">店主文字数</th>
                    <th className="pb-2">完了日</th>
                  </tr>
                </thead>
                <tbody>
                  {data.interviews.map((iv) => (
                    <tr key={iv.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{iv.shop_name}</td>
                      <td className="py-2 pr-4">{iv.total_messages}</td>
                      <td className="py-2 pr-4">{iv.user_messages}</td>
                      <td className="py-2 pr-4">
                        {iv.total_user_chars.toLocaleString()}
                        {iv.total_user_chars < 500 && (
                          <span className="ml-1 rounded bg-yellow-100 px-1 text-xs text-yellow-700">
                            寡黙
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(iv.completed_at).toLocaleDateString("ja-JP")}
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
