"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        setError("リセットメールの送信に失敗しました。メールアドレスをご確認ください。");
        return;
      }

      setIsSent(true);
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
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
            {isSent ? (
              // 送信完了メッセージ
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
                <h1 className="mt-4 text-xl font-bold">メールを送信しました</h1>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">{email}</span> 宛に
                  パスワードリセット用のリンクを送信しました。
                  メールに記載されたリンクをクリックして、新しいパスワードを設定してください。
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  メールが届かない場合は、迷惑メールフォルダをご確認ください。
                </p>
                <div className="mt-6 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsSent(false);
                      setEmail("");
                    }}
                  >
                    別のメールアドレスで再送信
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/login">ログインページに戻る</Link>
                  </Button>
                </div>
              </div>
            ) : (
              // リセット申請フォーム
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold">パスワードをリセット</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    登録したメールアドレスを入力してください。
                    パスワードリセット用のリンクをお送りします。
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
                    <label htmlFor="reset-email" className="text-sm font-medium">
                      メールアドレス
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="mail@example.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      "リセットリンクを送信"
                    )}
                  </Button>
                </form>

                <div className="mt-6 space-y-3 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    ログインに戻る
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    登録したメールアドレスがわからない場合は
                    <Link href="/contact" className="text-primary hover:underline ml-1">
                      お問い合わせ
                    </Link>
                    よりご連絡ください。
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
