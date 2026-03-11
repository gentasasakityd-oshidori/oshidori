"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, CheckCircle2, XCircle, Clock, AlertTriangle, Globe, Instagram, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type Application = {
  id: string;
  user_id: string;
  shop_name: string;
  shop_genre: string | null;
  shop_area: string | null;
  applicant_name: string;
  applicant_role: string | null;
  message: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  application_step: number | null;
  address_prefecture: string | null;
  address_city: string | null;
  address_street: string | null;
  address_building: string | null;
  phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  tabelog_url: string | null;
  gmb_url: string | null;
  users: { nickname: string | null; avatar_url: string | null } | null;
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "フォロー必要", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  pending: { label: "審査中", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "承認", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "却下", color: "bg-red-100 text-red-800", icon: XCircle },
};

const STEP_LABELS: Record<number, string> = {
  1: "基本情報まで入力",
  2: "所在地・連絡先まで入力",
  3: "入力完了（未送信）",
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // 各ステータスの件数を取得
  const fetchCounts = useCallback(async () => {
    const statuses = ["draft", "pending", "approved", "rejected"];
    const newCounts: Record<string, number> = {};
    for (const status of statuses) {
      try {
        const res = await fetch(`/api/admin/applications?status=${status}`);
        const data = await res.json();
        newCounts[status] = (data.applications || []).length;
      } catch {
        newCounts[status] = 0;
      }
    }
    setCounts(newCounts);
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/applications?status=${statusFilter}`);
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      console.error("Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleReview = async (applicationId: string, action: "approved" | "rejected") => {
    setProcessingId(applicationId);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          action,
          review_note: reviewNotes[applicationId] || "",
        }),
      });

      if (res.ok) {
        fetchApplications();
        fetchCounts();
      }
    } catch {
      console.error("Failed to review application");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">店舗権限申請</h1>
      </div>

      {/* パイプラインサマリ（4タブ） */}
      <div className="mb-6 grid grid-cols-4 gap-2 sm:gap-3">
        {(["draft", "pending", "approved", "rejected"] as const).map((status) => {
          const info = STATUS_MAP[status];
          const Icon = info.icon;
          return (
            <button
              key={status}
              className={`rounded-lg border p-2 sm:p-3 text-center transition-colors ${
                statusFilter === status ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setStatusFilter(status)}
            >
              <Icon className={`mx-auto h-4 w-4 sm:h-5 sm:w-5 ${statusFilter === status ? "text-primary" : "text-gray-400"}`} />
              <p className="mt-1 text-lg font-bold">
                {counts[status] ?? "—"}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{info.label}</p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : applications.length === 0 ? (
        <p className="text-muted-foreground">
          {statusFilter === "draft"
            ? "フォローが必要な申請はありません"
            : statusFilter === "pending"
            ? "審査待ちの申請はありません"
            : "該当する申請はありません"}
        </p>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const statusInfo = STATUS_MAP[app.status] || STATUS_MAP.pending;
            return (
              <Card key={app.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{app.shop_name || "（店名未入力）"}</CardTitle>
                    <div className="flex items-center gap-2">
                      {app.status === "draft" && app.application_step && (
                        <Badge variant="outline" className="text-xs">
                          {STEP_LABELS[app.application_step] || `ステップ${app.application_step}`}
                        </Badge>
                      )}
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">申請者:</span>{" "}
                      {app.applicant_name || "未入力"}
                      {app.applicant_role && ` (${app.applicant_role})`}
                    </div>
                    <div>
                      <span className="text-muted-foreground">ユーザー:</span>{" "}
                      {app.users?.nickname || "不明"}
                    </div>
                    {app.shop_genre && (
                      <div>
                        <span className="text-muted-foreground">ジャンル:</span>{" "}
                        {app.shop_genre}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">申請日:</span>{" "}
                      {new Date(app.created_at).toLocaleDateString("ja-JP")}
                    </div>
                  </div>

                  {/* 住所・連絡先 */}
                  {(app.address_prefecture || app.phone) && (
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {app.address_prefecture && (
                        <div className="flex items-start gap-1">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {app.address_prefecture} {app.address_city} {app.address_street}
                            {app.address_building && ` ${app.address_building}`}
                          </span>
                        </div>
                      )}
                      {app.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{app.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SNS・ウェブサイト */}
                  {(app.website_url || app.instagram_url || app.tabelog_url || app.gmb_url) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {app.website_url && (
                        <a href={app.website_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100">
                          <Globe className="h-3 w-3" /> HP
                        </a>
                      )}
                      {app.instagram_url && (
                        <a href={app.instagram_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-pink-50 px-2 py-1 text-xs text-pink-700 hover:bg-pink-100">
                          <Instagram className="h-3 w-3" /> Instagram
                        </a>
                      )}
                      {app.tabelog_url && (
                        <a href={app.tabelog_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-orange-50 px-2 py-1 text-xs text-orange-700 hover:bg-orange-100">
                          食べログ
                        </a>
                      )}
                      {app.gmb_url && (
                        <a href={app.gmb_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100">
                          Google
                        </a>
                      )}
                    </div>
                  )}

                  {app.message && (
                    <div className="mt-3 rounded-md bg-warm-light p-3 text-sm">
                      <p className="text-muted-foreground">メッセージ:</p>
                      <p className="mt-1">{app.message}</p>
                    </div>
                  )}

                  {/* ドラフト: フォロー促進 */}
                  {app.status === "draft" && (
                    <div className="mt-4 rounded-md bg-orange-50 border border-orange-200 p-3 text-sm">
                      <div className="flex items-center gap-2 text-orange-800 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        登録が途中で中断されています
                      </div>
                      <p className="mt-1 text-xs text-orange-700">
                        ユーザーに連絡して登録の続行を促してください。
                        ユーザーが再度ページを開くと、保存済みの入力内容から再開できます。
                      </p>
                    </div>
                  )}

                  {app.status === "pending" && (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        placeholder="審査メモ（任意）"
                        rows={2}
                        value={reviewNotes[app.id] || ""}
                        onChange={(e) =>
                          setReviewNotes({ ...reviewNotes, [app.id]: e.target.value })
                        }
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReview(app.id, "approved")}
                          disabled={processingId === app.id}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          承認
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(app.id, "rejected")}
                          disabled={processingId === app.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          却下
                        </Button>
                      </div>
                    </div>
                  )}

                  {app.review_note && app.status !== "pending" && app.status !== "draft" && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      審査メモ: {app.review_note}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
