"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  MessageCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type InterviewItem = {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  status: string;
  current_phase: number;
  created_at: string;
  updated_at: string;
  message_count: number;
  user_message_count: number;
};

type InterviewStats = {
  total: number;
  completed: number;
  in_progress: number;
  completion_rate: number;
  avg_messages: number;
};

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/interviews");
        if (res.ok) {
          const data = await res.json();
          setInterviews(data.interviews);
          setStats(data.stats);
        }
      } catch {
        // Ignore
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI品質管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AIインタビューの実施状況と品質モニタリング
        </p>
      </div>

      {/* 統計サマリ */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総インタビュー数</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">完了率</p>
                <p className="text-xl font-bold">{stats.completion_rate}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats.completed}/{stats.total}件
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">進行中</p>
                <p className="text-xl font-bold">{stats.in_progress}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  平均メッセージ数
                </p>
                <p className="text-xl font-bold">{stats.avg_messages}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* インタビュー一覧 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">インタビュー一覧</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {interviews.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              インタビュー記録はありません
            </p>
          ) : (
            interviews.map((iv) => (
              <div
                key={iv.id}
                className="flex items-center gap-4 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/shops/${iv.shop_id}`}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {iv.shop_name}
                    </Link>
                    <Badge
                      variant={
                        iv.status === "completed"
                          ? "default"
                          : iv.status === "in_progress"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {iv.status === "completed"
                        ? "完了"
                        : iv.status === "in_progress"
                          ? "進行中"
                          : iv.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>フェーズ {iv.current_phase}/6</span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {iv.message_count}メッセージ
                    </span>
                    <span>
                      {new Date(iv.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>

                {/* フェーズ進捗バー */}
                <div className="hidden w-24 sm:block">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <div
                        key={p}
                        className={`h-1.5 flex-1 rounded-full ${
                          p <= iv.current_phase
                            ? "bg-primary"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
