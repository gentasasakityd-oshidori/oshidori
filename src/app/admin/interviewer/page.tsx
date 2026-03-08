"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Calendar,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  FileText,
  Mic,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PHASE_METADATA, type OnboardingPhase } from "@/lib/onboarding";

type InterviewerShop = {
  id: string;
  name: string;
  owner_name: string;
  category: string;
  area: string;
  onboarding_phase: string;
  created_at: string;
  updated_at: string;
  latestDesignDoc: { status: string; created_at: string } | null;
  assignment: {
    status: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
  } | null;
  latestInterview: { status: string } | null;
  nextAction: string;
};

type ApiResponse = {
  shops: InterviewerShop[];
  summary: {
    totalAssigned: number;
    pendingInterview: number;
    pendingAction: number;
  };
};

export default function AdminInterviewerPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/interviewer/shops");
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to fetch interviewer data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPhaseInfo = (phase: string) => {
    return PHASE_METADATA[phase as OnboardingPhase] ?? {
      label: phase,
      shortLabel: phase,
      color: "bg-gray-100",
      textColor: "text-gray-700",
    };
  };

  // タスクをカテゴリ別に分類
  const categorizeShops = (shops: InterviewerShop[]) => {
    return {
      designReview: shops.filter((s) =>
        ["ready_for_interview", "interviewer_assigned"].includes(s.onboarding_phase)
      ),
      interviewPending: shops.filter((s) =>
        s.onboarding_phase === "interview_scheduled"
      ),
      postInterview: shops.filter((s) =>
        ["interview_completed", "story_generating", "story_review"].includes(s.onboarding_phase)
      ),
      completed: shops.filter((s) =>
        ["photo_pending", "published"].includes(s.onboarding_phase)
      ),
    };
  };

  const categories = data ? categorizeShops(data.shops) : null;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">インタビュー管理</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          更新
        </Button>
      </div>

      {/* サマリーカード */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{data.summary.totalAssigned}</p>
                  <p className="text-xs text-muted-foreground">担当店舗</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{data.summary.pendingInterview}</p>
                  <p className="text-xs text-muted-foreground">インタビュー待ち</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{data.summary.pendingAction}</p>
                  <p className="text-xs text-muted-foreground">対応待ち</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
      ) : !categories ? null : (
        <div className="space-y-6">
          {/* 設計書確認 & 日程調整 */}
          {categories.designReview.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                設計書確認 & 日程調整
              </h2>
              <div className="space-y-2">
                {categories.designReview.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} getPhaseInfo={getPhaseInfo} />
                ))}
              </div>
            </section>
          )}

          {/* インタビュー実施予定 */}
          {categories.interviewPending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                インタビュー実施予定
              </h2>
              <div className="space-y-2">
                {categories.interviewPending.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} getPhaseInfo={getPhaseInfo} />
                ))}
              </div>
            </section>
          )}

          {/* インタビュー後処理 */}
          {categories.postInterview.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                インタビュー後処理
              </h2>
              <div className="space-y-2">
                {categories.postInterview.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} getPhaseInfo={getPhaseInfo} />
                ))}
              </div>
            </section>
          )}

          {/* 完了済み */}
          {categories.completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                完了済み
              </h2>
              <div className="space-y-2">
                {categories.completed.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} getPhaseInfo={getPhaseInfo} />
                ))}
              </div>
            </section>
          )}

          {data?.shops.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              割り当てられた店舗はありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShopCard({
  shop,
  getPhaseInfo,
}: {
  shop: InterviewerShop;
  getPhaseInfo: (phase: string) => { label: string; shortLabel: string; color: string; textColor: string };
}) {
  const phaseInfo = getPhaseInfo(shop.onboarding_phase);

  return (
    <Link href={`/admin/interviewer/${shop.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{shop.name}</h3>
                <Badge
                  variant="outline"
                  className={`${phaseInfo.color} ${phaseInfo.textColor} border-0 shrink-0`}
                >
                  {phaseInfo.shortLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{shop.owner_name}</span>
                <span>·</span>
                <span>{shop.area} / {shop.category}</span>
                {shop.assignment?.scheduled_date && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-orange-600">
                      <Calendar className="h-3 w-3" />
                      {new Date(shop.assignment.scheduled_date).toLocaleDateString("ja-JP")}
                      {shop.assignment.scheduled_time && ` ${shop.assignment.scheduled_time}`}
                    </span>
                  </>
                )}
              </div>
              {shop.nextAction && (
                <p className="mt-1 text-xs font-medium text-primary">
                  次のアクション: {shop.nextAction}
                </p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
