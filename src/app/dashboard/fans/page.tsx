"use client";

import { useState, useEffect } from "react";
import { Users, Heart, Loader2, User, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Fan = {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  registered_at: string;
};

export default function FansPage() {
  const [fans, setFans] = useState<Fan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/fans");
        if (!res.ok) {
          setError(res.status === 401 ? "ログインが必要です" : "データの読み込みに失敗しました");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setFans(data.fans ?? []);
      } catch {
        setError("ネットワークエラーが発生しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error === "ログインが必要です") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href="/login">ログインする</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold">ファン一覧</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          あなたのお店を推してくれている方の一覧です
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ファン数サマリー */}
      <Card className="border-primary/20 bg-warm">
        <CardContent className="flex items-center gap-3 p-4">
          <Heart className="h-5 w-5 fill-primary text-primary" />
          <div>
            <p className="text-sm font-medium">
              ファン数: <span className="text-lg text-primary">{fans.length}</span>人
            </p>
            <p className="text-xs text-muted-foreground">
              推し登録してくれたユーザーです
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 応援者リスト */}
      {fans.length > 0 ? (
        <div className="space-y-2">
          {fans.map((fan) => (
            <Card key={fan.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{fan.nickname}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(fan.registered_at).toLocaleDateString("ja-JP")}
                    から推し
                  </p>
                </div>
                <Heart className="h-4 w-4 fill-primary text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 font-medium">まだファンがいません</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              ストーリーを公開してQRコードを店頭に掲示すると、ファンが増えやすくなります
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
