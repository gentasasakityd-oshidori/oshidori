"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  MessageCircle,
  Check,
  X,
  CalendarClock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Reservation = {
  id: string;
  user_id: string;
  user_nickname: string;
  preferred_date: string;
  preferred_time: string;
  party_size: number;
  message: string | null;
  status: string;
  shop_response: string | null;
  alternative_date: string | null;
  alternative_time: string | null;
  created_at: string;
  responded_at: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "未対応", color: "bg-yellow-100 text-yellow-800" },
  accepted: { label: "承認済み", color: "bg-green-100 text-green-800" },
  declined: { label: "お断り", color: "bg-red-100 text-red-800" },
  alternative_proposed: { label: "代替日提案", color: "bg-blue-100 text-blue-800" },
};

export default function DashboardReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchReservations() {
    try {
      const url = filter
        ? `/api/dashboard/reservations?status=${filter}`
        : "/api/dashboard/reservations";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations ?? []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleRespond(reservationId: string, status: string) {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        reservation_id: reservationId,
        status,
        shop_response: responseText || undefined,
      };
      if (status === "alternative_proposed") {
        body.alternative_date = altDate || undefined;
        body.alternative_time = altTime || undefined;
      }

      const res = await fetch("/api/dashboard/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setRespondingId(null);
        setResponseText("");
        setAltDate("");
        setAltTime("");
        fetchReservations();
      }
    } catch {
      // Ignore
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = reservations.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">予約打診管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          お客様からの予約打診に対応しましょう
        </p>
      </div>

      {/* サマリー */}
      <Card className="border-primary/20 bg-warm">
        <CardContent className="flex items-center gap-3 p-4">
          <CalendarClock className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">未対応の打診</p>
          </div>
        </CardContent>
      </Card>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: null, label: "すべて" },
          { value: "pending", label: "未対応" },
          { value: "accepted", label: "承認済み" },
          { value: "declined", label: "お断り" },
        ].map((f) => (
          <Button
            key={f.value ?? "all"}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* 予約一覧 */}
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">読み込み中...</p>
      ) : reservations.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">予約打診はまだありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((r) => {
            const statusInfo = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending;
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.user_nickname}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(r.preferred_date).toLocaleDateString("ja-JP")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {r.preferred_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {r.party_size}名
                        </span>
                      </div>
                      {r.message && (
                        <p className="text-sm text-foreground/80">
                          <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
                          {r.message}
                        </p>
                      )}
                      {r.shop_response && (
                        <div className="mt-2 rounded-md bg-muted/50 p-2 text-sm">
                          <span className="font-medium">返答: </span>
                          {r.shop_response}
                        </div>
                      )}
                      {r.alternative_date && (
                        <div className="text-sm text-blue-600">
                          <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                          代替日: {new Date(r.alternative_date).toLocaleDateString("ja-JP")} {r.alternative_time}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>

                  {/* 返答フォーム */}
                  {r.status === "pending" && (
                    <div className="mt-4 border-t pt-3">
                      {respondingId === r.id ? (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="お客様へのメッセージ（任意）"
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="h-20"
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">代替日提案:</span>
                            <Input
                              type="date"
                              value={altDate}
                              onChange={(e) => setAltDate(e.target.value)}
                              className="w-40"
                            />
                            <Input
                              type="text"
                              placeholder="時間"
                              value={altTime}
                              onChange={(e) => setAltTime(e.target.value)}
                              className="w-24"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRespond(r.id, "accepted")}
                              disabled={submitting}
                              className="gap-1"
                            >
                              <Check className="h-3 w-3" />
                              承認
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRespond(r.id, "declined")}
                              disabled={submitting}
                              className="gap-1"
                            >
                              <X className="h-3 w-3" />
                              お断り
                            </Button>
                            {altDate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRespond(r.id, "alternative_proposed")}
                                disabled={submitting}
                                className="gap-1"
                              >
                                <CalendarClock className="h-3 w-3" />
                                代替日を提案
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRespondingId(null)}
                            >
                              キャンセル
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRespondingId(r.id)}
                        >
                          返答する
                        </Button>
                      )}
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
