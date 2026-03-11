"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // パスワードリセットリンクからの遷移で認証済みか確認
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (newPassword.length < 8) {
      setError("パスワードは8文字以上で設定してください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (error.message.includes("same_password")) {
          setError("現在と同じパスワードは設定できません。別のパスワードを入力してください。");
        } else {
          setError("パスワードの更新に失敗しました。もう一度お試しください。");
        }
        return;
      }

      setIsComplete(true);
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }

  // 読み込み中
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 未認証（リンクが無効または期限切れ）
  if (!isAuthenticated) {
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
          </div>
          <Card className="border-border/60 shadow-lg">
            <CardContent className="p-6 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-4 text-xl font-bold">リンクが無効です</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                パスワードリセットリンクの有効期限が切れているか、
                すでに使用済みです。もう一度リセットを申請してください。
              </p>
              <div className="mt-6 space-y-3">
                <Button asChild className="w-full">
                  <Link href="/forgot-password">パスワードリセットを再申請</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/login">ログインに戻る</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-warm-light px-4 py-12">
      <div className="w-full max-w-md">
        {/* ブランドヘッダー */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="オシドリ"
            width={160}
            height={44}
            className="mx-auto h-11 w-auto"
          />
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            {isComplete ? (
              // 完了メッセージ
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
                <h1 className="mt-4 text-xl font-bold">パスワードを変更しました</h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  新しいパスワードでログインできるようになりました。
                </p>
                <Button
                  className="mt-6 w-full"
                  onClick={() => {
                    router.push("/home");
                    router.refresh();
                  }}
                >
                  ホームに戻る
                </Button>
              </div>
            ) : (
              // パスワード再設定フォーム
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold">新しいパスワードを設定</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    8文字以上の新しいパスワードを入力してください。
                  </p>
                </div>

                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium">
                      新しいパスワード
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="8文字以上で設定"
                        className="pl-10 pr-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm font-medium">
                      パスワード（確認）
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="もう一度入力"
                        className="pl-10 pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      "パスワードを変更"
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
