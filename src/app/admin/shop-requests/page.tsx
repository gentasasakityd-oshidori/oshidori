"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, TrendingUp, MessageSquare, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type ShopRequest = {
  id: string;
  shop_name: string;
  area: string;
  reason: string | null;
  user_id: string | null;
  status: string;
  admin_note: string | null;
  contacted_at: string | null;
  priority: number;
  created_at: string;
};

type RankingItem = {
  shop_name: string;
  area: string;
  count: number;
  latest: string;
};

type FilterTab = "all" | "pending" | "contacted" | "onboarded" | "declined";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "未対応", variant: "secondary" },
  contacted: { label: "連絡済み", variant: "outline" },
  onboarded: { label: "掲載済み", variant: "default" },
  declined: { label: "見送り", variant: "destructive" },
};

export default function ShopRequestsPage() {
  const [requests, setRequests] = useState<ShopRequest[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/shop-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
        setRanking(data.ranking);
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }

  async function updateRequest(id: string, updates: Record<string, unknown>) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/shop-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...updates } as ShopRequest : r))
        );
        setEditingId(null);
      }
    } catch {
      // ignore
    }
    setUpdatingId(null);
  }

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const statusCounts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    contacted: requests.filter((r) => r.status === "contacted").length,
    onboarded: requests.filter((r) => r.status === "onboarded").length,
    declined: requests.filter((r) => r.status === "declined").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店舗リクエスト</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ユーザーからの掲載リクエストと人気ランキング
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* リクエストランキング */}
      {ranking.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              リクエストランキング
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ranking.slice(0, 10).map((item, i) => (
                <div
                  key={item.shop_name}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className={`w-6 text-center font-bold ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium">{item.shop_name}</span>
                  <span className="text-muted-foreground">{item.area}</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.count}件
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルタータブ */}
      <div className="mt-6 flex gap-2 border-b">
        {(
          [
            { key: "all" as FilterTab, label: "全件" },
            { key: "pending" as FilterTab, label: "未対応" },
            { key: "contacted" as FilterTab, label: "連絡済み" },
            { key: "onboarded" as FilterTab, label: "掲載済み" },
            { key: "declined" as FilterTab, label: "見送り" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {statusCounts[tab.key] > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* リクエスト一覧 */}
      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredRequests.map((req) => {
            const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
            return (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{req.shop_name}</span>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        エリア: {req.area}
                      </p>
                      {req.reason && (
                        <p className="mt-1 text-sm">
                          <MessageSquare className="mr-1 inline h-3 w-3 text-muted-foreground" />
                          {req.reason}
                        </p>
                      )}
                      {req.admin_note && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                          管理者メモ: {req.admin_note}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("ja-JP")}
                        {req.contacted_at && (
                          <span className="ml-2">
                            連絡日: {new Date(req.contacted_at).toLocaleDateString("ja-JP")}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center gap-1 shrink-0">
                      {req.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => updateRequest(req.id, { status: "contacted" })}
                            disabled={updatingId === req.id}
                          >
                            {updatingId === req.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            連絡済み
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground"
                            onClick={() => updateRequest(req.id, { status: "declined" })}
                            disabled={updatingId === req.id}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {req.status === "contacted" && (
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1"
                          onClick={() => updateRequest(req.id, { status: "onboarded" })}
                          disabled={updatingId === req.id}
                        >
                          {updatingId === req.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          掲載完了
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(editingId === req.id ? null : req.id);
                          setEditNote(req.admin_note || "");
                        }}
                      >
                        メモ
                      </Button>
                    </div>
                  </div>

                  {/* メモ編集エリア */}
                  {editingId === req.id && (
                    <div className="mt-3 flex gap-2">
                      <Textarea
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="管理者メモ..."
                        className="h-16 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => updateRequest(req.id, { admin_note: editNote })}
                        disabled={updatingId === req.id}
                      >
                        保存
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredRequests.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              該当するリクエストはありません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
