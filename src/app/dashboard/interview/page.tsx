"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Sparkles, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InterviewMetadata } from "@/types/ai";

type Message = {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
};

type InterviewPhase =
  | "not_started"
  | "warmup"
  | "origin"
  | "kodawari"
  | "menu_story"
  | "regulars"
  | "future"
  | "completed";

const PHASE_LABELS: Record<InterviewPhase, string> = {
  not_started: "開始前",
  warmup: "ウォームアップ",
  origin: "原点の物語",
  kodawari: "こだわりの深層",
  menu_story: "食べてほしい一品",
  regulars: "常連さんとの関係",
  future: "未来への想い",
  completed: "インタビュー完了",
};

const PHASE_ORDER: InterviewPhase[] = [
  "warmup",
  "origin",
  "kodawari",
  "menu_story",
  "regulars",
  "future",
];

const DEMO_SHOP_ID_KEY = "oshidori_demo_shop_id";

export default function InterviewPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<InterviewPhase>("not_started");
  const [isRecording, setIsRecording] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    story: unknown;
    menu: unknown;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);
  const progress =
    phase === "completed"
      ? 100
      : phase === "not_started"
        ? 0
        : ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getShopId = useCallback(async (): Promise<string | null> => {
    const cached = localStorage.getItem(DEMO_SHOP_ID_KEY);
    if (cached) return cached;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("shops")
        .select("id")
        .limit(1)
        .single();
      if (data) {
        const shopData = data as { id: string };
        localStorage.setItem(DEMO_SHOP_ID_KEY, shopData.id);
        return shopData.id;
      }
    } catch {
      // フォールバック
    }
    return null;
  }, []);

  async function handleStart() {
    setIsStarting(true);
    try {
      const shopId = await getShopId();
      if (!shopId) {
        setMessages([
          {
            id: "error",
            role: "ai",
            content:
              "店舗データが見つかりません。先にSupabaseにシードデータを投入してください。",
            timestamp: new Date(),
          },
        ]);
        setIsStarting(false);
        return;
      }

      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shopId }),
      });

      if (!res.ok) throw new Error("Failed to start interview");

      const data = await res.json();
      setInterviewId(data.interview_id);
      setPhase("warmup");
      setMessages([
        {
          id: "init",
          role: "ai",
          content: data.message.content,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages([
        {
          id: "error",
          role: "ai",
          content:
            "インタビューの開始に失敗しました。OpenAI APIキーが.env.localに設定されているか確認してください。",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || isLoading || !interviewId) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_id: interviewId,
          content: userMsg.content,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      const metadata = data.metadata as InterviewMetadata | null;

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: data.message.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (metadata?.should_transition && metadata.next_phase) {
        setPhase(metadata.next_phase as InterviewPhase);
      }
    } catch {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "ai",
        content: "送信に失敗しました。もう一度お試しください。",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          // MVP: 音声入力の文字起こしはサーバーサイドAPI経由で実装予定
          // 現時点ではテキスト入力のみ対応
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
      } catch {
        // マイクアクセスが拒否された場合
      }
    }
  }

  async function handleGenerate() {
    if (!interviewId) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/interview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: interviewId }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      setGenerationResult({ story: data.story, menu: data.menu });
    } catch {
      // エラー時
    } finally {
      setIsGenerating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // 未開始状態
  if (phase === "not_started" && messages.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="text-center">
          <Sparkles className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">AIインタビュー</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            あなたのお店のストーリーを一緒に作りましょう。
            <br />
            約20分の対話で、お店の魅力を引き出します。
          </p>
          <Button
            size="lg"
            className="mt-6"
            onClick={handleStart}
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                準備中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                インタビューを始める
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ヘッダー */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">AIインタビュー</h1>
            <p className="text-xs text-muted-foreground">
              あなたのお店のストーリーを一緒に作りましょう
            </p>
          </div>
          <Badge variant={phase === "completed" ? "default" : "secondary"}>
            {PHASE_LABELS[phase]}
          </Badge>
        </div>

        {/* 進捗バー */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>

        {/* フェーズインジケーター */}
        <div className="mt-2 flex gap-1">
          {PHASE_ORDER.map((p, i) => (
            <div
              key={p}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentPhaseIndex ? "bg-primary" : "bg-muted"
              }`}
              title={PHASE_LABELS[p]}
            />
          ))}
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-warm border border-border"
                }`}
              >
                {msg.role === "ai" && (
                  <div className="mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      オシドリAI
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {msg.content}
                </p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    msg.role === "user"
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* ローディング */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-warm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    オシドリAI
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* 完了 → ストーリー生成ボタン */}
          {phase === "completed" && !generationResult && (
            <Card className="border-primary/30 bg-warm p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-2 font-bold">
                インタビューお疲れ様でした！
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                いただいたお話をもとに、ストーリーと「食べてほしい一品」を生成します。
              </p>
              <Button
                size="lg"
                className="mt-4"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...（約1分）
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    ストーリーを生成する
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* 生成完了 */}
          {generationResult && (
            <Card className="border-primary/30 bg-warm p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-2 font-bold">
                ストーリーが生成されました！
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                ストーリーと「食べてほしい一品」が生成されました。管理画面で確認・編集できます。
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" asChild>
                  <a href="/dashboard/stories">ストーリーを確認する</a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMessages([]);
                    setPhase("not_started");
                    setInterviewId(null);
                    setGenerationResult(null);
                  }}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  もう一度
                </Button>
              </div>
            </Card>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* 入力エリア */}
      {phase !== "completed" && phase !== "not_started" && (
        <div className="border-t bg-background px-4 py-3">
          <div className="mx-auto flex max-w-2xl gap-2">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className="shrink-0"
              onClick={toggleRecording}
              title={isRecording ? "録音停止" : "音声入力"}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Textarea
              placeholder="ここに入力してください... (Shift+Enterで改行)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="mt-1 text-center text-xs text-destructive animate-pulse">
              録音中... もう一度マイクボタンを押して停止
            </p>
          )}
        </div>
      )}
    </div>
  );
}
