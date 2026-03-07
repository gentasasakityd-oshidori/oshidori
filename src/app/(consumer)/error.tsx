"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ConsumerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Consumer page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
        <span className="text-3xl">🍽</span>
      </div>
      <h2 className="text-xl font-bold text-[#2C3E50]">
        ページを表示できませんでした
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground max-w-xs">
        通信状況をご確認の上、もう一度お試しください。
      </p>
      <div className="mt-5 flex gap-3">
        <Button
          onClick={reset}
          className="bg-[#E06A4E] hover:bg-[#d0593d]"
        >
          再読み込み
        </Button>
        <Button variant="outline" asChild>
          <Link href="/home">ホームへ</Link>
        </Button>
      </div>
    </div>
  );
}
