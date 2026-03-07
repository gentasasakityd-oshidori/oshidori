"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ハッシュリンク（#section）へのスムーズスクロールを処理するコンポーネント。
 * Next.js App Router ではページ遷移後にハッシュスクロールが自動で行われないケースがあるため、
 * クライアントサイドで明示的にスクロールを実行する。
 */
export function HashScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    // DOM が描画されるまで少し待つ
    const timer = setTimeout(() => {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
