"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Zap,
  TrendingUp,
  BarChart3,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CostSummary = {
  total_cost_usd: number;
  total_cost_jpy: number;
  today_cost_usd: number;
  today_cost_jpy: number;
  total_tokens: number;
  total_calls: number;
  avg_cost_per_interview_usd: number;
  avg_cost_per_interview_jpy: number;
  interview_count: number;
};

type DailyCost = {
  date: string;
  cost_usd: number;
  cost_jpy: number;
  tokens: number;
  calls: number;
};

type EndpointCost = {
  endpoint: string;
  cost_usd: number;
  cost_jpy: number;
  tokens: number;
  calls: number;
};

type CostData = {
  summary: CostSummary;
  daily_costs: DailyCost[];
  endpoint_costs: EndpointCost[];
};

/** 事業計画の1回あたりコスト目標（円） */
const TARGET_COST_PER_INTERVIEW_JPY = 100;

export default function AdminAICostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/ai-costs");
        if (res.ok) {
          setData(await res.json());
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

  if (!data) {
    return (
      <div className="text-center text-muted-foreground">
        データの読み込みに失敗しました
      </div>
    );
  }

  const { summary } = data;
  const isOverBudget =
    summary.avg_cost_per_interview_jpy > TARGET_COST_PER_INTERVIEW_JPY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">APIコストモニタリング</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          OpenAI API利用量・コスト推移（直近30日間）
        </p>
      </div>

      {/* サマリカード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">30日間 総コスト</p>
              <p className="text-xl font-bold">
                {summary.total_cost_jpy.toLocaleString()}円
              </p>
              <p className="text-xs text-muted-foreground">
                ${summary.total_cost_usd.toFixed(4)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">本日のコスト</p>
              <p className="text-xl font-bold">
                {summary.today_cost_jpy.toLocaleString()}円
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.total_calls}回のAPIコール
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isOverBudget ? "bg-red-50" : "bg-orange-50"}`}
            >
              {isOverBudget ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <BarChart3 className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                1インタビューあたり平均
              </p>
              <p
                className={`text-xl font-bold ${isOverBudget ? "text-red-600" : ""}`}
              >
                {summary.avg_cost_per_interview_jpy.toLocaleString()}円
              </p>
              <p
                className={`text-xs font-medium ${isOverBudget ? "text-red-500" : "text-primary"}`}
              >
                目標: {TARGET_COST_PER_INTERVIEW_JPY}円以下
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">総トークン数</p>
              <p className="text-xl font-bold">
                {summary.total_tokens.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.interview_count}件のインタビュー
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* アラート */}
      {isOverBudget && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">
                コスト目標を超過しています
              </p>
              <p className="mt-1 text-sm text-red-700">
                1インタビューあたりの平均コストが目標（
                {TARGET_COST_PER_INTERVIEW_JPY}円）を超えています。
                プロンプトの最適化やモデルの見直しを検討してください。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日別コスト推移 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">日別コスト推移</CardTitle>
        </CardHeader>
        <CardContent>
          {data.daily_costs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              まだAPI利用データがありません
            </p>
          ) : (
            <div className="space-y-1">
              {data.daily_costs.slice(-14).map((day) => {
                const maxCost = Math.max(
                  ...data.daily_costs.map((d) => d.cost_jpy),
                  1
                );
                const barWidth = Math.max((day.cost_jpy / maxCost) * 100, 2);
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">
                      {day.date.slice(5)}
                    </span>
                    <div className="relative flex-1">
                      <div
                        className="h-5 rounded bg-primary/20"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs font-medium">
                      {day.cost_jpy}円
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                      {day.calls}回
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* エンドポイント別コスト */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">エンドポイント別コスト</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {data.endpoint_costs.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              データなし
            </p>
          ) : (
            data.endpoint_costs.map((ep) => (
              <div
                key={ep.endpoint}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{ep.endpoint}</p>
                  <p className="text-xs text-muted-foreground">
                    {ep.calls}回 / {ep.tokens.toLocaleString()} tokens
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {ep.cost_jpy}円
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
