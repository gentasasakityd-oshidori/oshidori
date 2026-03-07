"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const SLIDES = [
  {
    emoji: "📖",
    title: "店主のストーリーを読む",
    description: "AIが引き出した店主の想い。\n点数では伝わらない魅力がここに。",
  },
  {
    emoji: "❤️",
    title: "共感で推す",
    description: "「ここに共感した」をタップ。\nあなたの気持ちが店主に届きます。",
  },
  {
    emoji: "⭐",
    title: "推し店をコレクション",
    description: "好きなお店を保存して、\nあなただけの食の地図を作ろう。",
  },
];

const STORAGE_KEY = "oshidori_onboarding_done";

export function OnboardingTutorial() {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  }

  function next() {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1);
    } else {
      dismiss();
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && current < SLIDES.length - 1) {
        setCurrent(current + 1);
      } else if (diff > 0 && current > 0) {
        setCurrent(current - 1);
      }
    }
    setTouchStart(null);
  }

  if (!show) return null;

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-6">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Emoji Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warm">
          <span className="text-4xl">{slide.emoji}</span>
        </div>

        {/* Title */}
        <h2 className="mt-5 text-xl font-bold text-[#2C3E50]">{slide.title}</h2>

        {/* Description */}
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {slide.description}
        </p>

        {/* Dot indicators */}
        <div className="mt-6 flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === current ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={next} className="w-full">
            {isLast ? "はじめる" : "次へ"}
          </Button>
          {!isLast && (
            <button
              onClick={dismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              スキップ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
