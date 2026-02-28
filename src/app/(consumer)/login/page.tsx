"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth" ? "認証に失敗しました。もう一度お試しください。" : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ログインフォーム
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 新規登録フォーム
  const [registerNickname, setRegisterNickname] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("メールアドレスまたはパスワードが正しくありません。");
        } else if (error.message.includes("Email not confirmed")) {
          setError("メールアドレスの確認が完了していません。受信トレイをご確認ください。");
        } else {
          setError(error.message);
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (registerNickname.length < 2 || registerNickname.length > 20) {
      setError("ニックネームは2〜20文字で入力してください。");
      return;
    }
    if (registerPassword.length < 8) {
      setError("パスワードは8文字以上で設定してください。");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            nickname: registerNickname,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setError("このメールアドレスは既に登録されています。");
        } else {
          setError(error.message);
        }
        return;
      }

      // メール確認が必要な場合は成功メッセージを表示
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSuccessMessage("確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。");
        return;
      }

      // メール確認不要の場合は即ログイン
      router.push("/");
      router.refresh();
    } catch {
      setError("登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("Google認証に失敗しました。");
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
          <p className="mt-3 text-sm text-muted-foreground">
            推しの飲食店と出会う。こだわりで、つながる。
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            {/* 成功メッセージ表示 */}
            {successMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* エラー表示 */}
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Tabs defaultValue="login">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  ログイン
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
                  新規登録
                </TabsTrigger>
              </TabsList>

              {/* ログインフォーム */}
              <TabsContent value="login">
                <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-medium">
                      メールアドレス
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="mail@example.com"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-medium">
                      パスワード
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="パスワードを入力"
                        className="pl-10 pr-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
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

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      "ログイン"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    <Link href="#" className="text-primary hover:underline">
                      パスワードをお忘れですか？
                    </Link>
                  </p>
                </form>
              </TabsContent>

              {/* 新規登録フォーム */}
              <TabsContent value="register">
                <form className="mt-6 space-y-4" onSubmit={handleRegister}>
                  <div className="space-y-2">
                    <label htmlFor="register-nickname" className="text-sm font-medium">
                      ニックネーム
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-nickname"
                        type="text"
                        placeholder="あなたのニックネーム（2〜20文字）"
                        className="pl-10"
                        value={registerNickname}
                        onChange={(e) => setRegisterNickname(e.target.value)}
                        minLength={2}
                        maxLength={20}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="register-email" className="text-sm font-medium">
                      メールアドレス
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="mail@example.com"
                        className="pl-10"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="register-password" className="text-sm font-medium">
                      パスワード
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="8文字以上で設定"
                        className="pl-10 pr-10"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showRegisterPassword ? (
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
                        処理中...
                      </>
                    ) : (
                      "アカウントを作成"
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    登録することで
                    <Link href="/terms" className="text-primary hover:underline">
                      利用規約
                    </Link>
                    と
                    <Link href="/privacy" className="text-primary hover:underline">
                      プライバシーポリシー
                    </Link>
                    に同意したことになります
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            {/* SNSログイン */}
            <div className="mt-6">
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  または
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  type="button"
                  onClick={handleGoogleLogin}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Googleでログイン
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  type="button"
                  disabled
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.365 9.863c.349 0 .63.285.63.631 0 3.188-1.684 7.132-6.426 7.132-3.695 0-6.569-2.975-6.569-6.65 0-3.674 2.874-6.65 6.569-6.65 1.81 0 3.173.71 4.137 1.637l-1.633 1.633c-.639-.592-1.478-1.04-2.504-1.04-2.133 0-3.873 1.795-3.873 4.02s1.74 4.02 3.873 4.02c2.47 0 3.4-1.773 3.54-2.69h-3.54v-2.043h5.796z"
                      fill="#06C755"
                    />
                  </svg>
                  LINEでログイン（近日公開）
                </Button>
              </div>
            </div>

            {/* ゲスト閲覧リンク */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                ゲストのまま閲覧する
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
