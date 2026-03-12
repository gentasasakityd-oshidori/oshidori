"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Search, Heart, Menu, X, LogOut, User, Store, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type HeaderProps = {
  initialUser?: { id: string; email?: string } | null;
  initialNickname?: string | null;
};

export function Header({ initialUser = null, initialNickname = null }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  // サーバーサイドで取得した初期値を使用（SSRハイドレーションフリッカー防止）
  const [user, setUser] = useState<SupabaseUser | null>(
    initialUser ? ({ id: initialUser.id, email: initialUser.email } as SupabaseUser) : null
  );
  const [nickname, setNickname] = useState<string | null>(initialNickname);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /** /home#forecast のような同一ページ内ハッシュリンクを処理 */
  const handleHashNavigation = useCallback(
    (e: React.MouseEvent, targetPath: string, hash: string) => {
      if (pathname === targetPath) {
        e.preventDefault();
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        window.history.pushState(null, "", `${targetPath}#${hash}`);
      }
      // 別のページにいる場合は Link のデフォルト動作（ナビゲーション）に任せる
    },
    [pathname]
  );

  useEffect(() => {
    const supabase = createClient();

    // 初期ユーザー取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("users")
          .select("nickname, role, is_admin")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            const d = data as { nickname: string; role: string; is_admin?: boolean } | null;
            setNickname(d?.nickname ?? null);
            setUserRole(d?.role ?? null);
            setIsAdmin(d?.role === "admin" || d?.is_admin === true);
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
          .select("nickname, role, is_admin")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            const d = data as { nickname: string; role: string; is_admin?: boolean } | null;
            setNickname(d?.nickname ?? null);
            setUserRole(d?.role ?? null);
            setIsAdmin(d?.role === "admin" || d?.is_admin === true);
          });
      } else {
        setNickname(null);
        setUserRole(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setNickname(null);
    setUserRole(null);
    setIsAdmin(false);
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
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/explore"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
          >
            お店を探す
          </Link>
          <Link
            href="/stories"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
          >
            ストーリー
          </Link>
          <Link
            href="/oshi"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
          >
            推し店
          </Link>
          <Link
            href="/home#forecast"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            onClick={(e) => handleHashNavigation(e, "/home", "forecast")}
          >
            相性予報
          </Link>
          <Link
            href="/for-shops"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
          >
            飲食店の方へ
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
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      本部管理
                    </Link>
                  </DropdownMenuItem>
                )}
                {(userRole === "shop_owner" || isAdmin) && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <Store className="mr-2 h-4 w-4" />
                      店舗管理
                    </Link>
                  </DropdownMenuItem>
                )}
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
            <SheetTitle className="sr-only">ナビゲーション</SheetTitle>
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
                href="/oshi"
                className="text-lg font-medium"
                onClick={() => setIsOpen(false)}
              >
                推し店
              </Link>
              <Link
                href="/mypage"
                className="text-lg font-medium"
                onClick={() => setIsOpen(false)}
              >
                マイページ
              </Link>
              <Link
                href="/for-shops"
                className="text-base text-muted-foreground"
                onClick={() => setIsOpen(false)}
              >
                飲食店オーナーの方へ
              </Link>
              <div className="mt-4 border-t pt-4">
                {user ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      ログイン中: {nickname ?? "ユーザー"}
                    </p>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                        onClick={() => setIsOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        本部管理
                      </Link>
                    )}
                    {(userRole === "shop_owner" || isAdmin) && (
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                        onClick={() => setIsOpen(false)}
                      >
                        <Store className="h-4 w-4" />
                        店舗管理へ
                      </Link>
                    )}
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
