"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  LogOut,
  Store,
  KeyRound,
  Loader2,
  Heart,
  MessageCircle,
  ChevronRight,
  Settings,
  CalendarCheck,
  HelpCircle,
  FileText,
  Sparkles,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { identifyUser } from "@/lib/posthog";
import { MoodTagSelector } from "@/components/mood-tag-selector";

export default function MyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("consumer");
  const [loginMethod, setLoginMethod] = useState("");
  const [registeredAt, setRegisteredAt] = useState("");
  const [oshiCount, setOshiCount] = useState(0);
  const [empathyCount, setEmpathyCount] = useState(0);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [showMoodTagSelector, setShowMoodTagSelector] = useState(false);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/mypage");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("nickname, role, created_at")
        .eq("id", user.id)
        .single();

      const typedUser = userData as { nickname: string; role: string; created_at: string } | null;
      const nick = typedUser?.nickname ?? user.user_metadata?.nickname ?? "ユーザー";
      setNickname(nick);
      setUserEmail(user.email || "");
      setUserRole(typedUser?.role || "consumer");
      setLoginMethod(user.app_metadata?.provider === "google" ? "Google" : "メール");
      setRegisteredAt(typedUser?.created_at || user.created_at || "");

      identifyUser(user.id, { nickname: nick, email: user.email });

      // 推し店数と共感数を取得
      try {
        const oshiRes = await fetch("/api/oshi/my");
        if (oshiRes.ok) {
          const data = await oshiRes.json();
          setOshiCount(data.oshi_count ?? 0);
          setEmpathyCount(data.empathy_count ?? 0);
        }
      } catch {
        // ignore
      }

      // 気分タグを取得
      try {
        const moodRes = await fetch("/api/mood-preferences");
        if (moodRes.ok) {
          const data = await moodRes.json();
          setMoodTags(data.mood_tags ?? []);
        }
      } catch {
        // ignore
      }

      setIsLoading(false);
    }
    loadData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* プロフィールセクション */}
      <section className="bg-warm px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold">{nickname}</h1>
              <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  推し店 {oshiCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  共感 {empathyCount}
                </span>
              </div>
            </div>
            {(userRole === "shop_owner" || userRole === "admin") && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">管理画面へ</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ナビゲーションリンク */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-2">
          {/* 気分タグ設定 */}
          <button
            onClick={() => setShowMoodTagSelector(true)}
            className="w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors hover:bg-muted/50"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="flex-1 text-left">
              <span className="text-sm font-medium">気分タグ設定</span>
              <p className="text-[11px] text-muted-foreground">
                {moodTags.length > 0
                  ? `${moodTags.length}個の気分タグを設定中`
                  : "あなたの気分にぴったりのお店をおすすめ"}
              </p>
            </div>
            {moodTags.length > 0 && (
              <Badge variant="secondary" className="text-xs">{moodTags.length}個</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <Link
            href="/oshi"
            className="flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors hover:bg-muted/50"
          >
            <Heart className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <span className="text-sm font-medium">推し店</span>
              <p className="text-[11px] text-muted-foreground">推し中のお店・共感履歴</p>
            </div>
            <Badge variant="secondary" className="text-xs">{oshiCount}店</Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/reservations"
            className="flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors hover:bg-muted/50"
          >
            <CalendarCheck className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <span className="text-sm font-medium">予約打診</span>
              <p className="text-[11px] text-muted-foreground">予約リクエストの確認</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/explore"
            className="flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors hover:bg-muted/50"
          >
            <Store className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <span className="text-sm font-medium">お店を探す</span>
              <p className="text-[11px] text-muted-foreground">こだわりのお店を見つける</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      {/* アカウント情報 */}
      <section className="px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="flex items-center gap-2 text-base font-bold mb-3">
            <Settings className="h-4 w-4 text-primary" />
            アカウント設定
          </h2>

          <Card>
            <CardContent className="divide-y p-0">
              {/* ニックネーム */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">ニックネーム</p>
                  {isEditingNickname ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="rounded border px-2 py-1 text-sm w-full max-w-[160px]"
                        maxLength={20}
                        minLength={2}
                      />
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs shrink-0"
                        onClick={async () => {
                          if (editNickname.length < 2) return;
                          const supabase = createClient();
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            await (supabase as any)
                              .from("users")
                              .update({ nickname: editNickname })
                              .eq("id", user.id);
                            setNickname(editNickname);
                          }
                          setIsEditingNickname(false);
                        }}
                      >
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs shrink-0"
                        onClick={() => setIsEditingNickname(false)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="text-sm font-medium">{nickname}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-primary"
                        onClick={() => {
                          setEditNickname(nickname);
                          setIsEditingNickname(true);
                        }}
                      >
                        編集
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* メールアドレス */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted-foreground">メールアドレス</p>
                <p className="mt-0.5 text-sm">{userEmail}</p>
              </div>

              {/* ログイン方法 */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted-foreground">ログイン方法</p>
                <p className="mt-0.5 text-sm">{loginMethod}</p>
              </div>

              {/* 登録日 */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted-foreground">登録日</p>
                <p className="mt-0.5 text-sm">
                  {registeredAt
                    ? new Date(registeredAt).toLocaleDateString("ja-JP")
                    : "不明"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="mx-auto max-w-3xl" />

      {/* その他のリンク */}
      <section className="px-4 py-6 pb-24">
        <div className="mx-auto max-w-3xl space-y-2">
          <Link
            href="/about"
            className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">オシドリについて</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/terms"
            className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">利用規約</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/privacy"
            className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">プライバシーポリシー</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* ログアウト */}
          <Button
            variant="outline"
            className="mt-4 w-full text-muted-foreground"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </Button>

          {/* アカウント削除 */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-2 w-full text-center text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
            >
              アカウントを削除する
            </button>
          ) : (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">アカウント削除は取り消せません</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    推し店・共感履歴・来店記録など、すべてのデータが削除されます。
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  確認のため「削除」と入力してください
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="削除"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  disabled={deleteConfirmText !== "削除" || isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      const res = await fetch("/api/account/delete", { method: "DELETE" });
                      const data = await res.json();
                      if (res.ok) {
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        router.push("/login");
                      } else {
                        alert(data.error || "削除に失敗しました");
                      }
                    } catch {
                      alert("エラーが発生しました");
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      削除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1 h-3 w-3" />
                      アカウント削除
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 気分タグセレクターモーダル */}
      {showMoodTagSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowMoodTagSelector(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MoodTagSelector
              onClose={() => {
                setShowMoodTagSelector(false);
                // 気分タグを再取得
                fetch("/api/mood-preferences")
                  .then((res) => res.json())
                  .then((data) => setMoodTags(data.mood_tags ?? []))
                  .catch(() => {});
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
