"use client";

import { useState, useEffect } from "react";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ShopUpdate = {
  id: string;
  content: string;
  update_type: string;
  created_at: string;
};

export default function DashboardUpdatesPage() {
  const [updates, setUpdates] = useState<ShopUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchUpdates() {
    try {
      const res = await fetch("/api/dashboard/updates");
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates ?? []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUpdates();
  }, []);

  async function handlePost() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setContent("");
        fetchUpdates();
      }
    } catch {
      // Ignore
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(updateId: string) {
    if (!confirm("この投稿を削除しますか？")) return;
    try {
      const res = await fetch("/api/dashboard/updates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_id: updateId }),
      });
      if (res.ok) {
        fetchUpdates();
      }
    } catch {
      // Ignore
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">近況更新</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          お店の近況をファンにお知らせしましょう（280文字以内）
        </p>
      </div>

      {/* 投稿フォーム */}
      <Card>
        <CardContent className="p-4">
          <Textarea
            placeholder="今日のおすすめ、季節の一品、お店からのお知らせなど..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mb-3 min-h-[100px] resize-none"
            maxLength={280}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {content.length}/280
            </span>
            <Button
              onClick={handlePost}
              disabled={!content.trim() || content.length > 280 || submitting}
              size="sm"
              className="gap-1"
            >
              <Send className="h-3.5 w-3.5" />
              投稿する
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 投稿一覧 */}
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">読み込み中...</p>
      ) : updates.length === 0 ? (
        <div className="py-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">まだ近況投稿はありません</p>
          <p className="mt-1 text-xs text-muted-foreground">
            上のフォームからお店の近況を投稿してみましょう
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => (
            <Card key={update.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="whitespace-pre-line text-sm leading-relaxed">
                      {update.content}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(update.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(update.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
