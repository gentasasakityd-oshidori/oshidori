"use client";

import { useState } from "react";
import { Sparkles, Loader2, Lightbulb, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdviceItem = {
  category: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

type AdviceResponse = {
  advice: AdviceItem[];
  summary: string;
};

const CATEGORY_ICONS: Record<string, typeof Lightbulb> = {
  engagement: TrendingUp,
  benefit: Lightbulb,
  growth: Target,
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-red-400 bg-red-50/50",
  medium: "border-l-amber-400 bg-amber-50/50",
  low: "border-l-blue-400 bg-blue-50/50",
};

export function FanClubAiAdvisor({ shopId }: { shopId: string }) {
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  async function requestAdvice() {
    setIsLoading(true);
    setHasRequested(true);
    try {
      const res = await fetch("/api/dashboard/fan-club/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shopId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdvice(data);
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }

  if (!hasRequested) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-amber-50/30">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">AIアドバイザー</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            ファンクラブの運営状況を分析して、改善アドバイスをAIが提案します
          </p>
          <Button
            className="mt-4 gap-2"
            onClick={requestAdvice}
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4" />
            アドバイスを受ける
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">分析中...</p>
        </CardContent>
      </Card>
    );
  }

  if (!advice) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">アドバイスの取得に失敗しました</p>
          <Button variant="outline" className="mt-3" onClick={requestAdvice}>
            再試行
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AIアドバイス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{advice.summary}</p>
        </CardContent>
      </Card>

      {advice.advice.map((item, i) => {
        const Icon = CATEGORY_ICONS[item.category] ?? Lightbulb;
        return (
          <Card
            key={i}
            className={`border-l-4 ${PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.low}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={requestAdvice} disabled={isLoading}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          再分析
        </Button>
      </div>
    </div>
  );
}
