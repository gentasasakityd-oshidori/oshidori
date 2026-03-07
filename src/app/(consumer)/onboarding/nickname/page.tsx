"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function NicknamePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 未認証ならログインへリダイレクト
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
      } else {
        setIsChecking(false);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError("ニックネームは2〜20文字で入力してください。");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ nickname: trimmed } as never)
        .eq("id", user.id);

      if (updateError) {
        setError("保存に失敗しました。もう一度お試しください。");
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-warm-light px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="オシドリ"
            width={160}
            height={44}
            className="mx-auto h-11 w-auto"
          />
          <h1 className="mt-4 text-xl font-bold">ようこそ！</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            あなたのニックネームを教えてください
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="nickname" className="text-sm font-medium">
                  ニックネーム
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="2〜20文字で入力"
                    className="pl-10"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    minLength={2}
                    maxLength={20}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  他のユーザーに表示される名前です。あとから変更できます。
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "はじめる"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
