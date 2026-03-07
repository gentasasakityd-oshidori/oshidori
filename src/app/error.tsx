"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-warm/30">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <span className="text-4xl">😢</span>
      </div>
      <h1 className="text-2xl font-bold text-[#2C3E50]">エラーが発生しました</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        申し訳ありません。予期せぬエラーが発生しました。
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} className="bg-[#E06A4E] hover:bg-[#d0593d]">
          もう一度試す
        </Button>
        <Button variant="outline" asChild>
          <Link href="/home">ホームへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
