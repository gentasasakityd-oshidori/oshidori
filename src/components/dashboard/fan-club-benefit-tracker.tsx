"use client";

import { useState, useEffect } from "react";
import { Gift, Check, Clock, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Benefit = {
  id: string;
  benefit_name: string;
  benefit_type: string;
  schedule_type: string;
  description: string | null;
  is_active: boolean;
  provided_count: number;
};

const BENEFIT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  discount: { label: "割引", color: "bg-green-100 text-green-700" },
  exclusive_menu: { label: "限定メニュー", color: "bg-purple-100 text-purple-700" },
  event: { label: "イベント", color: "bg-blue-100 text-blue-700" },
  message: { label: "メッセージ", color: "bg-amber-100 text-amber-700" },
  general: { label: "一般", color: "bg-gray-100 text-gray-700" },
};

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  always: "常時",
  monthly: "月1回",
  seasonal: "季節限定",
  one_time: "一度きり",
};

export function FanClubBenefitTracker({ planId }: { planId: string }) {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/fan-club/benefits?plan_id=${planId}`);
        if (res.ok) {
          const data = await res.json();
          setBenefits(data.benefits ?? []);
        }
      } catch {
        // ignore
      }
      setIsLoading(false);
    }
    load();
  }, [planId]);

  async function toggleBenefitActive(benefitId: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/dashboard/fan-club/benefits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benefit_id: benefitId, is_active: !currentActive }),
      });
      if (res.ok) {
        setBenefits((prev) =>
          prev.map((b) => (b.id === benefitId ? { ...b, is_active: !currentActive } : b))
        );
        toast.success(!currentActive ? "特典を有効化しました" : "特典を無効化しました");
      }
    } catch {
      toast.error("更新に失敗しました");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (benefits.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Gift className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            特典がまだ登録されていません
          </p>
          <p className="text-xs text-muted-foreground">
            プラン編集で特典を追加すると、ここで提供履歴を管理できます
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">特典トラッカー</h3>
      </div>

      {benefits.map((benefit) => {
        const typeInfo = BENEFIT_TYPE_LABELS[benefit.benefit_type] ?? BENEFIT_TYPE_LABELS.general;
        return (
          <Card key={benefit.id} className={!benefit.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{benefit.benefit_name}</span>
                    <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>
                      {typeInfo.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="mr-1 h-2.5 w-2.5" />
                      {SCHEDULE_TYPE_LABELS[benefit.schedule_type] ?? benefit.schedule_type}
                    </Badge>
                  </div>
                  {benefit.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{benefit.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>提供回数: {benefit.provided_count}回</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => toggleBenefitActive(benefit.id, benefit.is_active)}
                >
                  {benefit.is_active ? (
                    <><Check className="mr-1 h-3 w-3 text-green-500" />有効</>
                  ) : (
                    "無効"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
