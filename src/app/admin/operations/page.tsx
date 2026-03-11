"use client";

import { useState, useEffect } from "react";
import { Settings, DollarSign, Sparkles, ScrollText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TabKey = "quality" | "costs" | "logs";

export default function AdminOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("quality");
  const [qualityData, setQualityData] = useState<Record<string, unknown> | null>(null);
  const [costData, setCostData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [quality, cost] = await Promise.all([
        fetch("/api/admin/quality").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/admin/ai-costs").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      setQualityData(quality);
      setCostData(cost);
      setLoading(false);
    }
    fetchData();
  }, []);

  const TABS: { key: TabKey; label: string; icon: typeof Settings }[] = [
    { key: "quality", label: "AI品質管理", icon: Sparkles },
    { key: "costs", label: "APIコスト", icon: DollarSign },
    { key: "logs", label: "操作ログ", icon: ScrollText },
  ];

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
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">運用管理</h1>
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

      {activeTab === "quality" && (
        <div className="space-y-4">
          {qualityData ? (
            <Card>
              <CardHeader><CardTitle className="text-base">AI品質スコア</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-96">{JSON.stringify(qualityData, null, 2)}</pre>
              </CardContent>
            </Card>
          ) : (
            <p className="py-8 text-center text-muted-foreground">品質データはまだありません</p>
          )}
        </div>
      )}

      {activeTab === "costs" && (
        <div className="space-y-4">
          {costData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">今月のコスト</p>
                    <p className="text-2xl font-bold">
                      ${typeof (costData as Record<string, unknown>).monthly_total === "number"
                        ? ((costData as Record<string, unknown>).monthly_total as number).toFixed(2)
                        : "0.00"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">API呼び出し数</p>
                    <p className="text-2xl font-bold">
                      {String((costData as Record<string, unknown>).total_calls ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">平均コスト/呼出</p>
                    <p className="text-2xl font-bold">
                      ${typeof (costData as Record<string, unknown>).avg_cost_per_call === "number"
                        ? ((costData as Record<string, unknown>).avg_cost_per_call as number).toFixed(4)
                        : "0.00"}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">コスト詳細</CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto max-h-96">{JSON.stringify(costData, null, 2)}</pre>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-muted-foreground">コストデータはまだありません</p>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <Card>
          <CardHeader><CardTitle className="text-base">操作ログ</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              操作ログ機能は次回アップデートで詳細表示に対応予定です。
            </p>
            <Badge variant="outline" className="mt-2">準備中</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
