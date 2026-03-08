"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  Loader2,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronRight,
  BookOpen,
  UtensilsCrossed,
  Camera,
  CheckCircle2,
  Pause,
  Play,
  CalendarPlus,
  RefreshCw,
  PlusCircle,
  CheckSquare,
  Square,
  Lightbulb,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InterviewMetadata, StoryOutput, MenuOutput, PhotoRequestOutput } from "@/types/ai";

// ─── 型定義 ───

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

/** インタビュー種別 */
type InterviewType = "initial" | "seasonal_menu" | "monthly_update" | "menu_addition";

/** 画面ステップ */
type ScreenStep =
  | "type_select"     // 種別選択（初回完了済み用）
  | "intro"           // はじめに画面
  | "prep_check"      // 準備チェック
  | "mode_select"     // モード選択
  | "interview"       // インタビュー進行
  | "completing"      // 完了・生成中
  | "result_preview"; // 生成結果プレビュー

const INTERVIEW_TYPES: { id: InterviewType; label: string; desc: string; duration: string; icon: typeof Sparkles }[] = [
  { id: "seasonal_menu", label: "季節メニューの追加", desc: "新しい季節メニューについてお話しください", duration: "約10分", icon: CalendarPlus },
  { id: "menu_addition", label: "メニューの追加", desc: "新しいメニューのストーリーを作りましょう", duration: "約10分", icon: PlusCircle },
  { id: "monthly_update", label: "月次アップデート", desc: "最近のお店の近況をお聞かせください", duration: "約15分", icon: RefreshCw },
  { id: "initial", label: "初回インタビューをやり直す", desc: "フルバージョンのインタビューを最初から", duration: "約30分", icon: Sparkles },
];

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

/** 各フェーズの推定所要時間（分）── v6.1: 全体30分 */
const PHASE_ESTIMATED_MINUTES: Record<string, number> = {
  warmup: 3,
  origin: 8,
  kodawari: 8,
  menu_story: 5,
  regulars: 3,
  future: 3,
};

const PHASE_ORDER: InterviewPhase[] = [
  "warmup",
  "origin",
  "kodawari",
  "menu_story",
  "regulars",
  "future",
];

/** @deprecated 旧キー。移行のためクリア用に残す */
const LEGACY_SHOP_ID_KEY = "oshidori_demo_shop_id";

/** ユーザーごとの店舗IDキャッシュキーを生成 */
function shopIdCacheKey(userId: string) {
  return `oshidori_shop_id_${userId}`;
}

// Web Speech API の型宣言（ブラウザ組込み）
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never;
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

// FAQ項目
const FAQ_ITEMS = [
  {
    q: "どんなことを聞かれますか？",
    a: "お店を始めたきっかけ、こだわり、おすすめの一品、常連さんとのエピソード、未来への想いなどをお聞きします。",
  },
  {
    q: "うまく話せるか不安です",
    a: "大丈夫です！ナオが質問を通じて自然に引き出します。短い回答でも、掘り下げて魅力的なストーリーにまとめます。",
  },
  {
    q: "途中でやめられますか？",
    a: "はい、いつでも一時停止できます。あとから続きを再開することも可能です。",
  },
  {
    q: "生成されたストーリーは修正できますか？",
    a: "もちろんです。公開前に確認・修正ができます。納得いくまで調整してから公開してください。",
  },
];

/** 準備チェック項目コンポーネント */
function PrepCheckItem({ item }: { item: { id: string; label: string; hint: string; icon: React.ReactNode } }) {
  const [checked, setChecked] = useState(false);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
        checked ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/20 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {checked ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {item.icon}
            <p className={`text-sm font-semibold ${checked ? "text-primary" : ""}`}>
              {item.label}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
        </div>
      </div>
    </button>
  );
}

export default function InterviewPage() {
  // ─── 状態管理 ───
  const [hasCompletedInitial, setHasCompletedInitial] = useState(false);
  const [interviewType, setInterviewType] = useState<InterviewType>("initial");
  const [step, setStep] = useState<ScreenStep>("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<InterviewPhase>("not_started");
  const [isRecording, setIsRecording] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    story: StoryOutput | null;
    menu: MenuOutput | null;
    photoRequest: PhotoRequestOutput | null;
    interviewSummary: { summary: string; strengths: string[]; unique_value: string } | null;
    storyThemes: Record<string, number> | null;
    structuredTags: { kodawari: string[]; personality: string[]; scene: string[] } | null;
  } | null>(null);
  const [resultTab, setResultTab] = useState<"story" | "menu" | "photo">("story");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackValues, setFeedbackValues] = useState({
    process_satisfaction: 0,
    self_discovery: 0,
    motivation_boost: 0,
  });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState("00:00");

  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);
  const progress =
    phase === "completed"
      ? 100
      : phase === "not_started"
        ? 0
        : ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;

  // 初回インタビュー完了チェック
  useEffect(() => {
    async function checkInitialInterview() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // 旧キャッシュクリア
        localStorage.removeItem(LEGACY_SHOP_ID_KEY);
        const shopId = localStorage.getItem(shopIdCacheKey(user.id));
        if (!shopId) return;
        const { data } = await supabase
          .from("ai_interviews")
          .select("id")
          .eq("shop_id", shopId)
          .eq("status", "completed")
          .limit(1);
        if (data && data.length > 0) {
          setHasCompletedInitial(true);
          setStep("type_select");
        }
      } catch {
        // Supabase未接続時は初回フローのまま
      }
    }
    checkInitialInterview();
  }, []);

  // Web Speech API 初期化
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (SR) {
      setVoiceSupported(true);
      const recognition = new SR() as SpeechRecognitionInstance;
      recognition.lang = "ja-JP";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interim += transcript;
          }
        }
        if (finalText) {
          setInput((prev) => prev + finalText);
          setInterimTranscript("");
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setInterimTranscript("");
      };

      recognition.onend = () => {
        // continuous モードで意図せず止まった場合、録音中なら再開
        setIsRecording((current) => {
          if (current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch { /* ignore */ }
          }
          return current;
        });
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 経過時間タイマー
  useEffect(() => {
    if (!startTime || step !== "interview" || isPaused) return;
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, step, isPaused]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── ショップID取得（owner_idベース、adminは全店舗アクセス可） ───
  const getShopId = useCallback(async (forceRefresh = false): Promise<string | null> => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    // 現在のユーザーIDを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 旧キャッシュをクリア（移行処理）
    localStorage.removeItem(LEGACY_SHOP_ID_KEY);

    const cacheKey = shopIdCacheKey(user.id);

    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    }

    try {
      // まず owner_id でユーザー自身の店舗を検索（最新作成順）
      const { data } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const shopData = data as { id: string };
        localStorage.setItem(cacheKey, shopData.id);
        return shopData.id;
      }

      // owner_idで見つからない場合、adminなら任意の店舗を取得
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      const userRole = (userData as { role: string } | null)?.role;
      if (userRole === "admin") {
        const { data: anyShop } = await supabase
          .from("shops")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (anyShop) {
          const shopData = anyShop as { id: string };
          localStorage.setItem(cacheKey, shopData.id);
          return shopData.id;
        }
      }
    } catch {
      // フォールバック
    }
    localStorage.removeItem(cacheKey);
    return null;
  }, []);

  // ─── インタビュー開始 ───
  async function handleStart() {
    setIsStarting(true);
    try {
      let shopId = await getShopId();
      if (!shopId) {
        setMessages([
          {
            id: "error",
            role: "ai",
            content: "店舗データが見つかりません。先にSupabaseにシードデータを投入してください。",
            timestamp: new Date(),
          },
        ]);
        setStep("interview");
        setIsStarting(false);
        return;
      }

      let res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_id: shopId, interview_type: interviewType }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === "Shop not found") {
          // キャッシュ無効 → 強制リフレッシュ
          shopId = await getShopId(true);
          if (!shopId) throw new Error("店舗データが見つかりません");
          res = await fetch("/api/interview/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop_id: shopId, interview_type: interviewType }),
          });
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setInterviewId(data.interview_id);
      setPhase("warmup");
      setStartTime(new Date());
      setMessages([
        {
          id: "init",
          role: "ai",
          content: data.message.content,
          timestamp: new Date(),
        },
      ]);
      setStep("interview");
      // 音声モードなら自動で録音開始
      if (isVoiceMode && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
            setIsRecording(true);
          } catch { /* ignore */ }
        }, 500);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setMessages([
        {
          id: "error",
          role: "ai",
          content: `インタビューの開始に失敗しました。\n\nエラー詳細: ${detail}`,
          timestamp: new Date(),
        },
      ]);
      setStep("interview");
    } finally {
      setIsStarting(false);
    }
  }

  // ─── メッセージ送信 ───
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
        const nextPhase = metadata.next_phase as InterviewPhase;
        setPhase(nextPhase);

        // completed になったら自動的に完了・生成フローへ
        if (nextPhase === "completed") {
          setStep("completing");
          handleGenerate();
        }
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

  // ─── 音声入力（Web Speech API） ───
  function toggleRecording() {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimTranscript("");
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        // already started or permission denied
      }
    }
  }

  // ─── ストーリー生成 ───
  async function handleGenerate() {
    if (!interviewId) return;

    try {
      const res = await fetch("/api/interview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_id: interviewId }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      setGenerationResult({
        story: data.story,
        menu: data.menu,
        photoRequest: data.photoRequest,
        interviewSummary: data.interviewSummary ?? null,
        storyThemes: data.storyThemes ?? null,
        structuredTags: data.structuredTags ?? null,
      });
      setStep("result_preview");
    } catch {
      // エラー時は completing 画面にリトライボタンを表示
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    setMessages([]);
    setPhase("not_started");
    setInterviewId(null);
    setGenerationResult(null);
    setStep(hasCompletedInitial ? "type_select" : "intro");
    setInterviewType("initial");
    setStartTime(null);
    setElapsed("00:00");
    setResultTab("story");
    setIsPaused(false);
    setFeedbackSent(false);
    setFeedbackValues({ process_satisfaction: 0, self_discovery: 0, motivation_boost: 0 });
  }

  // ─── ⓪ インタビュータイプ選択画面（初回完了済み用） ───
  if (step === "type_select") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">おかえりなさい！</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              初回インタビューは完了済みです。
              <br />
              追加したいコンテンツを選んでください。
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {INTERVIEW_TYPES.map((type) => (
              <button
                key={type.id}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-border p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                onClick={() => {
                  setInterviewType(type.id);
                  if (type.id === "initial") {
                    setStep("intro");
                  } else {
                    setStep("mode_select");
                  }
                }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <type.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.desc}</p>
                </div>
                <div className="shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {type.duration}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── ① はじめに画面 ───
  if (step === "intro") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* ヘッダー */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">
              お店のストーリーを作りましょう
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              オシドリ編集部の<span className="font-semibold text-foreground">ナオ</span>が、
              あなたのお店の魅力をインタビューで引き出します。
            </p>
          </div>

          {/* インタビューの流れ */}
          <Card className="mt-6">
            <CardContent className="space-y-4 p-5">
              <h3 className="text-sm font-semibold">インタビューの流れ</h3>
              <div className="space-y-3">
                {[
                  { icon: "1", label: "ウォームアップ", desc: "リラックスしてお話しましょう" },
                  { icon: "2", label: "お店の原点", desc: "飲食の道に入ったきっかけ" },
                  { icon: "3", label: "こだわりの深層", desc: "食材・調理法・空間のこだわり" },
                  { icon: "4", label: "食べてほしい一品", desc: "看板メニューのストーリー" },
                  { icon: "5", label: "常連さんとの関係", desc: "心に残るエピソード" },
                  { icon: "6", label: "未来への想い", desc: "これからのビジョン" },
                ].map((item) => (
                  <div key={item.icon} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 所要時間 */}
          <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center">
            <p className="text-sm font-medium text-blue-800">
              約30分のおしゃべりで、お店の魅力を引き出します
            </p>
            <p className="mt-0.5 text-xs text-blue-600">
              途中でいつでも中断・再開できます
            </p>
          </div>

          {/* FAQ */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              よくある質問
            </h3>
            {FAQ_ITEMS.map((faq, i) => (
              <button
                key={i}
                className="w-full rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{faq.q}</span>
                  {openFaqIndex === i ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
                {openFaqIndex === i && (
                  <p className="mt-2 text-xs text-muted-foreground">{faq.a}</p>
                )}
              </button>
            ))}
          </div>

          {/* 開始ボタン */}
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => setStep("prep_check")}
          >
            準備チェックへ
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <button
            type="button"
            className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setStep("mode_select")}
          >
            スキップして始める →
          </button>
        </div>
      </div>
    );
  }

  // ─── ①-2 準備チェック画面 ───
  if (step === "prep_check") {
    const PREP_ITEMS = [
      {
        id: "origin",
        label: "お店を始めたきっかけ",
        hint: "なぜこの道に？ 何がきっかけで飲食の世界へ？",
        icon: <Heart className="h-4 w-4 text-rose-500" />,
      },
      {
        id: "kodawari",
        label: "食材・料理へのこだわり",
        hint: "仕入れ先、調理法、味付けなど、大切にしていること",
        icon: <UtensilsCrossed className="h-4 w-4 text-amber-600" />,
      },
      {
        id: "signature",
        label: "看板メニュー・おすすめ",
        hint: "一番食べてほしい一品、その料理にまつわるエピソード",
        icon: <Sparkles className="h-4 w-4 text-primary" />,
      },
      {
        id: "atmosphere",
        label: "お店の雰囲気・空間づくり",
        hint: "内装、BGM、席配置…どんな空間にしたいか",
        icon: <BookOpen className="h-4 w-4 text-blue-500" />,
      },
      {
        id: "customers",
        label: "お客さまとの思い出",
        hint: "心に残る常連さんとのエピソード、嬉しかった言葉",
        icon: <MessageSquare className="h-4 w-4 text-green-600" />,
      },
    ];

    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <Lightbulb className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">
              インタビューの準備
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              以下のテーマについて、ざっくり思い浮かべておくと
              <br />スムーズにお話しいただけます
            </p>
          </div>

          {/* 準備チェックリスト */}
          <div className="mt-6 space-y-3">
            {PREP_ITEMS.map((item) => (
              <PrepCheckItem key={item.id} item={item} />
            ))}
          </div>

          {/* Tips */}
          <div className="mt-6 rounded-lg bg-green-50 px-4 py-3">
            <p className="text-sm font-medium text-green-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              完璧に準備しなくて大丈夫！
            </p>
            <p className="mt-1 text-xs text-green-600">
              インタビュアーのナオが自然に引き出しますので、リラックスしてお話しください。
              メモや写真があれば手元に用意しておくと便利です。
            </p>
          </div>

          {/* 次へボタン */}
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => setStep("mode_select")}
          >
            準備OK！入力方法を選ぶ
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <button
            type="button"
            className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setStep("intro")}
          >
            ← 前の画面に戻る
          </button>
        </div>
      </div>
    );
  }

  // ─── ② モード選択画面 ───
  if (step === "mode_select") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <h1 className="text-xl font-bold">入力方法を選んでください</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              どちらでもOK。途中で切り替えることもできます。
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {/* テキストモード */}
            <button
              className={`rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${!isVoiceMode ? "border-primary bg-primary/5" : "border-border"}`}
              onClick={() => {
                setIsVoiceMode(false);
                handleStart();
              }}
              disabled={isStarting}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">テキストで回答</p>
                  <p className="text-xs text-muted-foreground">
                    文字入力で回答します。じっくり考えながら答えたい方に。
                  </p>
                </div>
              </div>
              <Badge className="mt-3" variant="secondary">おすすめ</Badge>
            </button>

            {/* 音声モード */}
            <button
              className={`rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${isVoiceMode ? "border-primary bg-primary/5" : "border-border"} ${!voiceSupported ? "opacity-60" : ""}`}
              onClick={() => {
                setIsVoiceMode(true);
                handleStart();
              }}
              disabled={isStarting || !voiceSupported}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${voiceSupported ? "bg-primary/10" : "bg-muted"}`}>
                  <Mic className={`h-6 w-6 ${voiceSupported ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className={`font-semibold ${!voiceSupported ? "text-muted-foreground" : ""}`}>音声で回答</p>
                  <p className="text-xs text-muted-foreground">
                    話しかけるだけで回答できます。手が離せない方に。
                  </p>
                </div>
              </div>
              {voiceSupported ? (
                <Badge className="mt-3" variant="secondary">マイクで入力</Badge>
              ) : (
                <Badge className="mt-3" variant="outline">お使いのブラウザは非対応です</Badge>
              )}
            </button>
          </div>

          {isStarting && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              ナオが準備しています...
            </div>
          )}

          <button
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setStep("intro")}
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  // ─── ④ 完了・生成中画面 ───
  if (step === "completing") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          {/* お祝いアニメーション */}
          <div className="relative mx-auto h-24 w-24">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h2 className="mt-6 text-xl font-bold">
            インタビューお疲れ様でした！
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ナオがいただいたお話をもとに、ストーリーと
            「食べてほしい一品」を作成しています...
          </p>

          {/* 生成進捗 */}
          <div className="mt-8 space-y-3">
            {[
              { label: "ストーリー作成", done: !!generationResult?.story },
              { label: "「食べてほしい一品」作成", done: !!generationResult?.menu },
              { label: "撮影リクエスト作成", done: !!generationResult?.photoRequest },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border p-3">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                )}
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            約1分ほどかかります。このままお待ちください。
          </p>

          {!generationResult && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleGenerate}
              size="sm"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              もう一度試す
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── ⑤ 生成結果プレビュー画面 ───
  if (step === "result_preview" && generationResult) {
    const { story, menu, photoRequest, interviewSummary, storyThemes, structuredTags } = generationResult;

    const THEME_LABELS: Record<string, string> = {
      origin: "原点の物語",
      food_craft: "食の職人技",
      hospitality: "心のおもてなし",
      community: "コミュニティ",
      personality: "人柄・キャラクター",
      local_connection: "街とのつながり",
      vision: "未来への想い",
    };

    const handleFeedbackSubmit = async () => {
      if (!interviewId) return;
      const shopId = await getShopId();
      if (!shopId) return;
      try {
        await fetch("/api/interview/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interview_id: interviewId,
            shop_id: shopId,
            ...feedbackValues,
          }),
        });
        setFeedbackSent(true);
      } catch {
        // フィードバック送信失敗は無視
      }
    };

    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* インタビューサマリー（振り返り） */}
        {interviewSummary && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-primary">ナオからのメッセージ</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                {interviewSummary.summary}
              </p>
              {interviewSummary.strengths.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground">お店の強み</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {interviewSummary.strengths.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {interviewSummary.unique_value && (
                <p className="mt-3 text-xs italic text-muted-foreground">
                  {interviewSummary.unique_value}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <h2 className="mt-3 text-xl font-bold">完成しました！</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            内容を確認して、公開の準備をしましょう。
          </p>
        </div>

        {/* タブ切り替え */}
        <div className="mt-6 flex rounded-lg border bg-muted/50 p-1">
          {[
            { id: "story" as const, label: "ストーリー", icon: BookOpen },
            { id: "menu" as const, label: "一品", icon: UtensilsCrossed },
            { id: "photo" as const, label: "撮影リクエスト", icon: Camera },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                resultTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setResultTab(tab.id)}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        <div className="mt-4">
          {/* ストーリータブ */}
          {resultTab === "story" && (
            <Card>
              <CardContent className="p-5">
                {story ? (
                  <>
                    <h3 className="text-lg font-bold">{story.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {story.summary}
                    </p>
                    <div className="mt-4 space-y-3">
                      {story.body.split("\n\n").map((paragraph, i) => (
                        paragraph.trim() && (
                          <div key={i} className="group relative rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/30">
                            <p className="whitespace-pre-line text-base leading-[1.85]">
                              {paragraph}
                            </p>
                            <button
                              type="button"
                              className="absolute -right-1 top-1 hidden rounded-md border bg-background px-2 py-1 text-[10px] text-muted-foreground shadow-sm transition-colors hover:text-primary group-hover:flex items-center gap-1"
                              onClick={() => {
                                const feedback = prompt(`段落${i + 1}への修正リクエスト：\n\n「${paragraph.slice(0, 50)}…」\n\nどう変えたいですか？`);
                                if (feedback) {
                                  alert(`修正リクエストを受け付けました：\n「${feedback}」\n\n※ 今後のバージョンで自動反映されます`);
                                }
                              }}
                            >
                              ✏️ 修正依頼
                            </button>
                          </div>
                        )
                      ))}
                    </div>
                    {story.key_quotes.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          印象的な言葉
                        </p>
                        {story.key_quotes.map((q, i) => (
                          <blockquote
                            key={i}
                            className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground"
                          >
                            {q}
                          </blockquote>
                        ))}
                      </div>
                    )}
                    {story.emotion_tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {story.emotion_tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* テーマスコア */}
                    {storyThemes && (
                      <div className="mt-5 border-t pt-4">
                        <p className="text-xs font-semibold text-muted-foreground">
                          テーマスコア
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {Object.entries(storyThemes).map(([key, score]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="w-28 text-xs text-muted-foreground">
                                {THEME_LABELS[key] ?? key}
                              </span>
                              <div className="h-2 flex-1 rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${(score / 10) * 100}%` }}
                                />
                              </div>
                              <span className="w-6 text-right text-xs font-medium">
                                {score}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 構造化タグ */}
                    {structuredTags && (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-xs font-semibold text-muted-foreground">
                          自動抽出タグ
                        </p>
                        <div className="mt-2 space-y-2">
                          {structuredTags.kodawari?.length > 0 && (
                            <div>
                              <span className="text-[10px] text-muted-foreground">こだわり</span>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {structuredTags.kodawari.map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {structuredTags.personality?.length > 0 && (
                            <div>
                              <span className="text-[10px] text-muted-foreground">店主の人柄</span>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {structuredTags.personality.map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {structuredTags.scene?.length > 0 && (
                            <div>
                              <span className="text-[10px] text-muted-foreground">おすすめシーン</span>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {structuredTags.scene.map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    ストーリーの生成に失敗しました。
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* メニュータブ */}
          {resultTab === "menu" && (
            <Card>
              <CardContent className="p-5">
                {menu ? (
                  <>
                    <h3 className="text-lg font-bold">{menu.name}</h3>
                    <p className="mt-2 text-sm">{menu.description}</p>
                    <div className="mt-4 rounded-lg bg-warm p-4">
                      <p className="text-xs font-semibold text-primary">
                        店主のことば
                      </p>
                      <p className="mt-1 text-sm">{menu.owner_message}</p>
                    </div>
                    {menu.kodawari_text && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                          こだわり
                        </p>
                        <p className="mt-1 text-sm">{menu.kodawari_text}</p>
                      </div>
                    )}
                    {menu.eating_tip && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                          おいしい食べ方
                        </p>
                        <p className="mt-1 text-sm">{menu.eating_tip}</p>
                      </div>
                    )}
                    {menu.kodawari_tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {menu.kodawari_tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    メニューの生成に失敗しました。
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 撮影リクエストタブ */}
          {resultTab === "photo" && (
            <div className="space-y-3">
              {photoRequest && photoRequest.shots.length > 0 ? (
                photoRequest.shots.map((shot, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{shot.subject}</p>
                          <Badge
                            variant={shot.priority === "high" ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {shot.priority === "high"
                              ? "必須"
                              : shot.priority === "medium"
                                ? "推奨"
                                : "あると嬉しい"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {shot.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  撮影リクエストの生成に失敗しました。
                </p>
              )}
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="mt-6 flex gap-3">
          <Button className="flex-1" asChild>
            <a href="/dashboard/stories">
              <BookOpen className="mr-2 h-4 w-4" />
              管理画面で確認する
            </a>
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-1 h-4 w-4" />
            最初から
          </Button>
        </div>

        {/* 体験フィードバック */}
        {!feedbackSent ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="p-5">
              <p className="text-sm font-semibold">このインタビューはいかがでしたか？</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ぜひ感想をお聞かせください（スキップ可）
              </p>
              <div className="mt-4 space-y-3">
                {([
                  { key: "process_satisfaction" as const, label: "インタビュー体験" },
                  { key: "self_discovery" as const, label: "お店の魅力の再発見" },
                  { key: "motivation_boost" as const, label: "やりがいの向上" },
                ] as const).map((item) => (
                  <div key={item.key}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <div className="mt-1 flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          className={`h-8 w-8 rounded-full text-sm transition-colors ${
                            feedbackValues[item.key] === n
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          onClick={() =>
                            setFeedbackValues((prev) => ({
                              ...prev,
                              [item.key]: n,
                            }))
                          }
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="mt-4"
                onClick={handleFeedbackSubmit}
                disabled={
                  feedbackValues.process_satisfaction === 0 &&
                  feedbackValues.self_discovery === 0 &&
                  feedbackValues.motivation_boost === 0
                }
              >
                フィードバックを送る
              </Button>
            </CardContent>
          </Card>
        ) : (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            フィードバックありがとうございます！
          </p>
        )}
      </div>
    );
  }

  // ─── ③ インタビュー進行画面 ───
  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col">
      {/* ヘッダー */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">ナオ（オシドリ編集部）</p>
              <p className="text-[10px] text-muted-foreground">
                {elapsed} 経過
                {phase !== "completed" && phase !== "not_started" && (() => {
                  const remaining = PHASE_ORDER.slice(currentPhaseIndex).reduce(
                    (sum, p) => sum + (PHASE_ESTIMATED_MINUTES[p] ?? 0), 0
                  );
                  return remaining > 0 ? ` ・ あと約${remaining}分` : "";
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={phase === "completed" ? "default" : "secondary"} className="text-xs">
              {PHASE_LABELS[phase]}
            </Badge>
            {phase !== "completed" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? "再開" : "一時停止"}
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
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

        {/* フェーズインジケーター（ラベル付き） */}
        <div className="mt-2 flex gap-1">
          {PHASE_ORDER.map((p, i) => (
            <div key={p} className="flex-1">
              <div
                className={`h-1 rounded-full transition-colors ${
                  i <= currentPhaseIndex ? "bg-primary" : "bg-muted"
                }`}
              />
              <p
                className={`mt-0.5 text-center text-[8px] leading-tight ${
                  i === currentPhaseIndex
                    ? "font-bold text-primary"
                    : i < currentPhaseIndex
                      ? "text-primary/60"
                      : "text-muted-foreground/50"
                }`}
              >
                {PHASE_LABELS[p]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 一時停止オーバーレイ */}
      {isPaused && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90">
          <div className="text-center">
            <Pause className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-bold">一時停止中</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              お好きなタイミングで再開できます
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => setIsPaused(false)}>
                <Play className="mr-2 h-4 w-4" />
                再開する
              </Button>
              <Button
                variant="outline"
                asChild
              >
                <a href="/dashboard">あとで続ける</a>
              </Button>
            </div>
          </div>
        </div>
      )}

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
                      ナオ
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
                    ナオ
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

          <div ref={scrollRef} />
        </div>
      </div>

      {/* 入力エリア */}
      {phase !== "completed" && (
        <div className="border-t bg-background px-4 py-3">
          <div className="mx-auto flex max-w-2xl gap-2">
            {voiceSupported && (
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className="shrink-0"
                onClick={toggleRecording}
                title={isRecording ? "音声入力を停止" : "音声入力を開始"}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}
            <div className="relative flex-1">
              <Textarea
                placeholder={isRecording ? "話してください..." : "ここに入力してください... (Shift+Enterで改行)"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
                disabled={isLoading}
              />
              {interimTranscript && (
                <p className="absolute bottom-1 left-3 right-3 truncate text-xs text-muted-foreground/60 italic">
                  {interimTranscript}
                </p>
              )}
            </div>
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
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <p className="text-xs text-muted-foreground">
                音声入力中... マイクボタンで停止
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
