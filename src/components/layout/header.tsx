"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Heart, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function Header() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // 初期ユーザー取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("users")
          .select("nickname")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            const d = data as { nickname: string } | null;
            setNickname(d?.nickname ?? null);
          });
      }
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("users")
          .select("nickname")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            const d = data as { nickname: string } | null;
            setNickname(d?.nickname ?? null);
          });
      } else {
        setNickname(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setNickname(null);
    router.push("/home");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* ロゴ */}
        <Link href="/home" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="オシドリ"
            width={100}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>

        {/* デスクトップナビ */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/explore"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            お店を探す
          </Link>
          <Link
            href="/stories"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ストーリー
          </Link>
        </nav>

        {/* デスクトップアクション */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/explore">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/mypage">
              <Heart className="h-4 w-4" />
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="max-w-[100px] truncate">
                    {nickname ?? "ユーザー"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/mypage" className="cursor-pointer">
                    <Heart className="mr-2 h-4 w-4" />
                    マイページ
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link href="/login">ログイン</Link>
            </Button>
          )}
        </div>

        {/* モバイルメニュー */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              {isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="mt-8 flex flex-col gap-4">
              <Link
                href="/explore"
                className="text-lg font-medium"
                onClick={() => setIsOpen(false)}
              >
                お店を探す
              </Link>
              <Link
                href="/stories"
                className="text-lg font-medium"
                onClick={() => setIsOpen(false)}
              >
                ストーリー
              </Link>
              <Link
                href="/mypage"
                className="text-lg font-medium"
                onClick={() => setIsOpen(false)}
              >
                推し店コレクション
              </Link>
              <div className="mt-4 border-t pt-4">
                {user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      ログイン中: {nickname ?? "ユーザー"}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      ログアウト
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" asChild>
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      ログイン
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
