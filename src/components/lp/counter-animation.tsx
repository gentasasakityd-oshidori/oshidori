"use client";

import { useRef, useEffect, useState } from "react";

interface CounterAnimationProps {
  /** 目標値 */
  target: number;
  /** 接尾辞（例: "%", "回", "円"） */
  suffix?: string;
  /** 接頭辞（例: "¥", "約"） */
  prefix?: string;
  /** アニメーション時間 (ms) */
  duration?: number;
  /** 千の位区切りを入れるか */
  separator?: boolean;
  className?: string;
}

/**
 * 数字がカウントアップするアニメーションコンポーネント。
 * ビューポートに入った時に0から目標値までカウントアップ。
 */
export function CounterAnimation({
  target,
  suffix = "",
  prefix = "",
  duration = 2000,
  separator = true,
  className = "",
}: CounterAnimationProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [started, target, duration]);

  const formatted = separator ? count.toLocaleString() : String(count);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
