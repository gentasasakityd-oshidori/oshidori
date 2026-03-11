"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface HeroSectionProps {
  /** 背景画像URL */
  backgroundImage: string;
  /** メインキャッチコピー（JSX可） */
  headline: React.ReactNode;
  /** サブコピー */
  subheadline?: React.ReactNode;
  /** CTAボタン群 */
  actions?: React.ReactNode;
  /** 右上バッジ */
  badge?: React.ReactNode;
  /** オーバーレイの暗さ (0-1) */
  overlayOpacity?: number;
  /** パララックス有効化 */
  parallax?: boolean;
  /** 最小高さ */
  minHeight?: string;
}

/**
 * 全画面ヒーローセクション
 * - ダークオーバーレイグラデーション
 * - パララックス効果（オプション）
 * - スクロールダウンインジケーター
 */
export function HeroSection({
  backgroundImage,
  headline,
  subheadline,
  actions,
  badge,
  overlayOpacity = 0.55,
  parallax = true,
  minHeight = "100svh",
}: HeroSectionProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!parallax) return;
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [parallax]);

  const bgTransform = parallax ? `translateY(${scrollY * 0.3}px)` : undefined;

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden"
      style={{ minHeight }}
    >
      {/* 背景画像 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          transform: bgTransform,
          willChange: parallax ? "transform" : undefined,
        }}
      />

      {/* グラデーションオーバーレイ */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to top,
            rgba(0,0,0,${overlayOpacity + 0.15}) 0%,
            rgba(0,0,0,${overlayOpacity}) 40%,
            rgba(0,0,0,${overlayOpacity * 0.6}) 70%,
            rgba(0,0,0,${overlayOpacity * 0.3}) 100%
          )`,
        }}
      />

      {/* 右上バッジ */}
      {badge && (
        <div className="absolute right-4 top-20 z-10 md:right-8 md:top-24">
          {badge}
        </div>
      )}

      {/* コンテンツ */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <h1 className="text-balance font-heading text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
          {headline}
        </h1>
        {subheadline && (
          <p className="text-balance mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
            {subheadline}
          </p>
        )}
        {actions && (
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {actions}
          </div>
        )}
      </div>

      {/* スクロールダウン */}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/60">
        <ChevronDown className="h-6 w-6" />
      </div>
    </section>
  );
}
