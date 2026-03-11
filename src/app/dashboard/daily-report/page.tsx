"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Check, Copy, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type GeneratedContent = {
  update?: { content: string; should_post: boolean };
  supply_flash?: { item_name: string; description: string; supply_type: string; should_post: boolean };
  sns?: { instagram: string; x: string };
};

type CompletionResults = {
  update_posted: boolean;
  flash_posted: boolean;
  update_content: string | null;
  flash_item: string | null;
  sns_instagram: string | null;
  sns_x: string | null;
};

export default function DailyReportPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isReadyToComplete, setIsReadyToComplete] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [results, setResults] = useState<CompletionResults | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 初期化: AI会話を開始
  useEffect(() => {
    async function start() {
      try {
        const res = await fetch("/api/dashboard/daily-report/start", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setShopId(data.shop_id);
          setShopName(data.shop_name);
          setMessages(data.messages);
        }
      } catch {
        // ignore
      }
      setIsStarting(false);
    }
    start();
  }, []);

  // メッセージ送信後に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/dashboard/daily-report/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, shop_name: shopName }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
        if (data.is_ready_to_complete) {
          setIsReadyToComplete(true);
        }
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
    inputRef.current?.focus();
  }

  async function completeReport() {
    setIsCompleting(true);
    try {
      const res = await fetch("/api/dashboard/daily-report/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, shop_id: shopId, shop_name: shopName }),
      });

      if (res.ok) {
        const data = await res.json();
        setGenerated(data.generated);
        setResults(data.results);
      }
    } catch {
      // ignore
    }
    setIsCompleting(false);
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (isStarting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 生成結果プレビュー画面
  if (generated) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">日報完了</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AIが会話から以下のコンテンツを生成しました
          </p>
        </div>

        {/* 近況更新 */}
        {generated.update?.content && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                近況更新
                {results?.update_posted && (
                  <Badge variant="default" className="text-xs">投稿済み</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{generated.update.content}</p>
            </CardContent>
          </Card>
        )}

        {/* 在庫速報 */}
        {generated.supply_flash?.should_post && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                在庫速報
                {results?.flash_posted && (
                  <Badge variant="default" className="text-xs">投稿済み</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{generated.supply_flash.item_name}</p>
              {generated.supply_flash.description && (
                <p className="mt-1 text-sm text-muted-foreground">{generated.supply_flash.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* SNSテキスト */}
        {(generated.sns?.instagram || generated.sns?.x) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SNS投稿テキスト</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generated.sns?.instagram && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Instagram</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-xs"
                      onClick={() => copyToClipboard(generated.sns!.instagram, "instagram")}
                    >
                      {copiedField === "instagram" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedField === "instagram" ? "コピー済" : "コピー"}
                    </Button>
                  </div>
                  <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-line">
                    {generated.sns.instagram}
                  </p>
                </div>
              )}
              {generated.sns?.x && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">X (Twitter)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-xs"
                      onClick={() => copyToClipboard(generated.sns!.x, "x")}
                    >
                      {copiedField === "x" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedField === "x" ? "コピー済" : "コピー"}
                    </Button>
                  </div>
                  <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-line">
                    {generated.sns.x}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setGenerated(null);
            setResults(null);
            setMessages([]);
            setIsReadyToComplete(false);
            // 新しい会話を開始
            fetch("/api/dashboard/daily-report/start", { method: "POST" })
              .then((r) => r.json())
              .then((data) => {
                setMessages(data.messages);
              });
          }}
        >
          新しい日報を作成
        </Button>
      </div>
    );
  }

  // チャットUI
  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI日報
        </h1>
        <p className="text-sm text-muted-foreground">
          AIと会話するだけで近況更新・在庫速報・SNS投稿を自動生成
        </p>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border shadow-sm"
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border bg-background px-4 py-2.5 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 完了ボタン */}
      {isReadyToComplete && (
        <div className="mt-3 flex justify-center">
          <Button
            onClick={completeReport}
            disabled={isCompleting}
            className="gap-2"
          >
            {isCompleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            日報を生成する
          </Button>
        </div>
      )}

      {/* 入力エリア */}
      <div className="mt-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={2}
          disabled={isLoading || isCompleting}
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading || isCompleting}
          className="shrink-0 self-end rounded-xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
