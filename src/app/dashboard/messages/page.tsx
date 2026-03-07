"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Send,
  Users,
  Clock,
  Eye,
  Loader2,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MessageRow = {
  id: string;
  shop_id: string;
  title: string;
  content: string;
  target: string;
  sent_at: string | null;
  read_count: number;
  open_rate: number;
  created_at: string;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [fanCount, setFanCount] = useState(0);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // 新規メッセージフォーム
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/messages");
        if (!res.ok) {
          setSendError(res.status === 401 ? "ログインが必要です" : "データの読み込みに失敗しました");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setMessages(data.messages ?? []);
        setFanCount(data.fanCount ?? 0);
        setShopId(data.shopId ?? null);
      } catch {
        setSendError("データの読み込みに失敗しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  function handleSendClick() {
    if (!shopId || !newTitle.trim() || !newContent.trim()) return;
    setSendError(null);
    setShowConfirm(true);
  }

  async function handleConfirmedSend() {
    setShowConfirm(false);
    if (!shopId || !newTitle.trim() || !newContent.trim()) return;
    setIsSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/dashboard/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shopId,
          title: newTitle,
          content: newContent,
          send_now: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSendError((errData as { error?: string }).error ?? "送信に失敗しました。もう一度お試しください。");
        setIsSending(false);
        return;
      }
      const data = await res.json();
      setMessages((prev) => [data.message as MessageRow, ...prev]);
      setNewTitle("");
      setNewContent("");
      setIsComposing(false);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      setSendError("ネットワークエラーが発生しました。もう一度お試しください。");
    }
    setIsSending(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">メッセージ配信</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ファンにメッセージを届けましょう
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setIsComposing(true)}
          disabled={isComposing}
        >
          <Plus className="h-4 w-4" />
          新しいメッセージ
        </Button>
      </div>

      {/* 送信完了通知 */}
      {sent && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-2 p-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-700">
              メッセージを送信しました！
            </p>
          </CardContent>
        </Card>
      )}

      {/* 応援者数表示 */}
      <Card className="border-primary/20 bg-warm">
        <CardContent className="flex items-center gap-3 p-4">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">
              現在のファン: <span className="text-lg text-primary">{fanCount}</span>人
            </p>
            <p className="text-xs text-muted-foreground">
              メッセージはすべてのファンに届きます
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 新規メッセージ作成 */}
      {isComposing && (
        <Card className="border-primary/30">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Send className="h-4 w-4 text-primary" />
                新しいメッセージを作成
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsComposing(false)}
              >
                <X className="mr-1 h-3 w-3" />
                キャンセル
              </Button>
            </div>

            {/* S-09: テンプレートワンタップ選択 */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "🍽 季節メニュー", title: "今月の限定メニューのお知らせ", body: "いつも推してくださりありがとうございます！\n今月から新しい季節メニューが登場しました。ぜひお試しください。" },
                { label: "🎉 お知らせ", title: "お知らせ", body: "いつも推してくださりありがとうございます！\n皆さんにお知らせがあります。" },
                { label: "🙏 感謝", title: "推してくださる皆さんへ", body: "いつも温かく推してくださりありがとうございます。\n皆さんの推しが日々の励みになっています。" },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:border-primary hover:text-primary"
                  onClick={() => { setNewTitle(tpl.title); setNewContent(tpl.body); }}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label htmlFor="msg-title" className="text-sm font-medium">タイトル</label>
              <Input
                id="msg-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例: 今月の限定メニューのお知らせ"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="msg-content" className="text-sm font-medium">本文</label>
              <Textarea
                id="msg-content"
                className="min-h-[120px]"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="ファンの皆さんへのメッセージを書いてください..."
              />
            </div>

            {sendError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{sendError}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {fanCount}人のファンに配信されます
              </p>
              <Button
                onClick={handleSendClick}
                disabled={isSending || !newTitle.trim() || !newContent.trim()}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                送信する
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* メッセージ一覧 */}
      {messages.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            送信済みメッセージ
          </h2>
          {messages.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{msg.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {msg.content}
                    </p>
                  </div>
                  <Badge variant={msg.sent_at ? "default" : "secondary"}>
                    {msg.sent_at ? "送信済み" : "下書き"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {msg.sent_at
                      ? new Date(msg.sent_at).toLocaleDateString("ja-JP")
                      : new Date(msg.created_at).toLocaleDateString("ja-JP")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {msg.read_count}人が既読
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    全ファン向け
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isComposing && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 font-medium">まだメッセージがありません</p>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                ファンにメッセージを送って、つながりを深めましょう
              </p>
              <Button className="mt-4" onClick={() => setIsComposing(true)}>
                <Plus className="mr-2 h-4 w-4" />
                最初のメッセージを書く
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* 送信確認ダイアログ */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メッセージを送信しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{fanCount}人</strong>のファン全員にメッセージが配信されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-sm font-medium">{newTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{newContent}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSend}>
              送信する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
