"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
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
  users: { nickname: string | null; avatar_url: string | null } | null;
};

const STATUS_MAP = {
  pending: { label: "審査中", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "承認", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "却下", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

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

      {/* O-04: パイプラインサマリ */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {(["pending", "approved", "rejected"] as const).map((status) => {
          const info = STATUS_MAP[status];
          const Icon = info.icon;
          return (
            <button
              key={status}
              className={`rounded-lg border p-3 text-center transition-colors ${
                statusFilter === status ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setStatusFilter(status)}
            >
              <Icon className={`mx-auto h-5 w-5 ${statusFilter === status ? "text-primary" : "text-gray-400"}`} />
              <p className="mt-1 text-lg font-bold">
                {applications.length > 0 || statusFilter === status ? applications.length : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{info.label}</p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : applications.length === 0 ? (
        <p className="text-muted-foreground">
          {statusFilter === "pending" ? "審査待ちの申請はありません" : "該当する申請はありません"}
        </p>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const statusInfo = STATUS_MAP[app.status as keyof typeof STATUS_MAP];
            return (
              <Card key={app.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{app.shop_name}</CardTitle>
                    <Badge className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">申請者:</span>{" "}
                      {app.applicant_name}
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
                    {app.shop_area && (
                      <div>
                        <span className="text-muted-foreground">エリア:</span>{" "}
                        {app.shop_area}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">申請日:</span>{" "}
                      {new Date(app.created_at).toLocaleDateString("ja-JP")}
                    </div>
                  </div>

                  {app.message && (
                    <div className="mt-3 rounded-md bg-warm-light p-3 text-sm">
                      <p className="text-muted-foreground">メッセージ:</p>
                      <p className="mt-1">{app.message}</p>
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

                  {app.review_note && app.status !== "pending" && (
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
