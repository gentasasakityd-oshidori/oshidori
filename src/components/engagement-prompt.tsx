"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { trackEngagementPromptResponse } from "@/lib/tracking";

const PROMPT_OPTIONS = [
  { emoji: "🔥", label: "職人魂に感動" },
  { emoji: "😊", label: "人柄が好き" },
  { emoji: "🍽️", label: "食べてみたい" },
  { emoji: "📍", label: "行ってみたい" },
];

const STORAGE_PREFIX = "oshidori_engagement_";

interface EngagementPromptProps {
  shopId: string;
  storyId: string;
  /** ストーリー読了完了時にtrueになる */
  visible: boolean;
}

export function EngagementPrompt({ shopId, storyId, visible }: EngagementPromptProps) {
  const [show, setShow] = useState(false);
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // 同じストーリーに対して一度しか表示しない
    const key = STORAGE_PREFIX + storyId;
    if (typeof window !== "undefined" && localStorage.getItem(key)) return;
    // 少し遅延して表示（読了後のタイミング）
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, [visible, storyId]);

  function handleSelect(label: string) {
    trackEngagementPromptResponse({ shopId, storyId, response: label });
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_PREFIX + storyId, "true");
    }
    setResponded(true);
    setTimeout(() => setShow(false), 1500);
  }

  function handleDismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_PREFIX + storyId, "true");
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mt-6 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[#2C3E50]">
          {responded ? "ありがとうございます！" : "このストーリーを読んで、どう感じましたか？"}
        </p>
        {!responded && (
          <button onClick={handleDismiss} className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {!responded && (
        <div className="mt-3 flex flex-wrap gap-2">
          {PROMPT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleSelect(opt.label)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-[#2C3E50] transition-colors hover:border-primary hover:bg-warm active:scale-95"
            >
              <span>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
      {responded && (
        <p className="mt-1 text-xs text-muted-foreground">
          あなたの声が、店主の励みになります。
        </p>
      )}
    </div>
  );
}
