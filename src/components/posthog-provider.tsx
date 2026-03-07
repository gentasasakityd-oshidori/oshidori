"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, identifyUser, resetUser, posthog } from "@/lib/posthog";
import { createClient } from "@/lib/supabase/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const identifiedRef = useRef(false);

  // 初期化 + ユーザー自動識別
  useEffect(() => {
    initPostHog();

    // Supabaseの認証状態を確認してPostHogにユーザーを紐付け
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !identifiedRef.current) {
        identifyUser(user.id, {
          email: user.email,
          provider: user.app_metadata?.provider ?? "unknown",
        });
        identifiedRef.current = true;
      }
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        identifyUser(session.user.id, {
          email: session.user.email,
          provider: session.user.app_metadata?.provider ?? "unknown",
        });
        identifiedRef.current = true;
      } else if (event === "SIGNED_OUT") {
        resetUser();
        identifiedRef.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ページビュートラッキング（SPA遷移対応）
  useEffect(() => {
    if (!pathname) return;
    const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
