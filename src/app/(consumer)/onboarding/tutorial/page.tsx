"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookOpen, Heart, FolderHeart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TUTORIAL_SLIDES = [
  {
    icon: BookOpen,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    title: "店主のストーリーを読む",
    description:
      "点数や口コミではわからない、店主の想いとこだわり。AIが引き出した物語を通じて、お店の本当の魅力に出会えます。",
    accent: "from-orange-50 to-amber-50",
  },
  {
    icon: Heart,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    title: "共感して推す",
    description:
      "ストーリーを読んで心が動いたら、共感タップで気持ちを伝えましょう。あなたの推しが、お店の力になります。",
    accent: "from-rose-50 to-pink-50",
  },
  {
    icon: FolderHeart,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    title: "コレクションを育てる",
    description:
      "推し店をコレクションに追加。あなただけの「こだわりの飲食店リスト」を育てていきましょう。",
    accent: "from-emerald-50 to-teal-50",
  },
] as const;

export default function TutorialPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const finishTutorial = useCallback(() => {
    try {
      localStorage.setItem("oshidori_tutorial_seen", "1");
    } catch {
      // localStorage unavailable
    }
    router.push("/home");
  }, [router]);

  const nextSlide = useCallback(() => {
    if (currentSlide < TUTORIAL_SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      finishTutorial();
    }
  }, [currentSlide, finishTutorial]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  }, [currentSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    setTouchStart(null);
  };

  const slide = TUTORIAL_SLIDES[currentSlide];
  const SlideIcon = slide.icon;
  const isLastSlide = currentSlide === TUTORIAL_SLIDES.length - 1;

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-between bg-white px-4 py-8">
      {/* Top: Logo + Skip */}
      <div className="flex w-full max-w-md items-center justify-between">
        <Image
          src="/logo.png"
          alt="オシドリ"
          width={100}
          height={28}
          className="h-7 w-auto"
        />
        <button
          onClick={finishTutorial}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          スキップ
        </button>
      </div>

      {/* Middle: Slide Content */}
      <div
        className="flex w-full max-w-md flex-1 flex-col items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br ${slide.accent}`}
        >
          <SlideIcon className={`h-12 w-12 ${slide.iconColor}`} />
        </div>

        <h1 className="mt-8 text-center text-2xl font-bold text-[#2C3E50]">
          {slide.title}
        </h1>
        <p className="mt-4 text-center text-base leading-relaxed text-muted-foreground">
          {slide.description}
        </p>
      </div>

      {/* Bottom: Dots + Button */}
      <div className="w-full max-w-md space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {TUTORIAL_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentSlide
                  ? "w-6 bg-primary"
                  : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <Button
          onClick={nextSlide}
          className="w-full"
          size="lg"
        >
          {isLastSlide ? (
            "はじめる"
          ) : (
            <>
              次へ
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
