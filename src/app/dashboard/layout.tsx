"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Store,
  Mic,
  MessageCircle,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  User,
  Crown,
  Bot,
  FileEdit,
  ClipboardEdit,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// サブページ → 親タブのマッピング（旧ルートを新タブに紐付け）
const ROUTE_GROUP_MAP: Record<string, string> = {
  "/dashboard/stories": "/dashboard/content",
  "/dashboard/menus": "/dashboard/content",
  "/dashboard/updates": "/dashboard/content",
  "/dashboard/supply-flash": "/dashboard/content",
  "/dashboard/photos": "/dashboard/content",
  "/dashboard/fans": "/dashboard/interaction",
  "/dashboard/fan-letters": "/dashboard/interaction",
  "/dashboard/messages": "/dashboard/interaction",
  "/dashboard/reservations": "/dashboard/interaction",
  "/dashboard/fan-club": "/dashboard/interaction",
  "/dashboard/shop": "/dashboard/settings",
  "/dashboard/qrcode": "/dashboard/settings",
  "/dashboard/integrations": "/dashboard/settings",
  "/dashboard/interview": "/dashboard/ai",
};

// ── 第1層: 日常タスク（最頻使用）──────────────────
// ── 第2層: 設定・管理（週1回程度）──────────────────
const NAV_ITEMS = [
  // 第1層
  {
    href: "/dashboard",
    label: "ホーム",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/daily-report",
    label: "日報",
    icon: ClipboardEdit,
  },
  {
    href: "/dashboard/content",
    label: "コンテンツ",
    icon: FileEdit,
  },
  {
    href: "/dashboard/interaction",
    label: "ファンクラブ運営",
    icon: Crown,
  },
  // 第2層
  {
    href: "/dashboard/settings",
    label: "店舗設定",
    icon: Store,
  },
  {
    href: "/dashboard/sns-hub",
    label: "SNS配信",
    icon: Share2,
  },
  {
    href: "/dashboard/ai",
    label: "AI機能",
    icon: Bot,
  },
];

function SidebarContent({
  pathname,
  onNavigate,
  userNickname,
  userEmail,
  loginProvider,
  onLogout,
}: {
  pathname: string;
  onNavigate?: () => void;
  userNickname: string | null;
  userEmail: string | null;
  loginProvider: string | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* ロゴ */}
      <div className="flex h-14 items-center gap-2 px-4">
        <Link
          href="/dashboard"
          className="flex items-center"
          onClick={onNavigate}
        >
          <Image
            src="/logo.png"
            alt="オシドリ"
            width={80}
            height={22}
            className="h-5 w-auto"
          />
        </Link>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          管理
        </span>
      </div>

      <Separator />

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4">
        {NAV_ITEMS.map((item, index) => {
          // 現在のパスが直接一致するか、サブルートがこのタブにグループされているか
          const mappedParent = ROUTE_GROUP_MAP[pathname];
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/") || mappedParent === item.href;
          return (
            <div key={item.href}>
              {/* 第1層と第2層の区切り */}
              {index === 4 && (
                <div className="my-3 border-t border-border/50 pt-2">
                  <span className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    設定・管理
                  </span>
                </div>
              )}
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-warm hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <Separator />

      {/* フッター: アカウント情報 + サイトに戻る */}
      <div className="space-y-3 p-4">
        {userNickname && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userNickname}</p>
              {userEmail && (
                <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
              )}
              <div className="flex items-center gap-2">
                {loginProvider && (
                  <span className="text-[10px] text-muted-foreground/70">
                    {loginProvider}でログイン
                  </span>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  <LogOut className="h-3 w-3" />
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        )}
        <Link
          href="/home"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onNavigate}
        >
          <ChevronLeft className="h-4 w-4" />
          消費者ページへ戻る
        </Link>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginProvider, setLoginProvider] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", user.id)
          .single();
        const nickname = (data as { nickname: string | null } | null)?.nickname;
        setUserNickname(nickname || user.email || null);
        setUserEmail(user.email || null);
        const provider = user.app_metadata?.provider;
        setLoginProvider(
          provider === "google" ? "Google" : provider === "email" ? "メール" : provider || null
        );
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* デスクトップサイドバー */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-warm-light md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent
            pathname={pathname}
            userNickname={userNickname}
            userEmail={userEmail}
            loginProvider={loginProvider}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      {/* メインエリア */}
      <div className="flex flex-1 flex-col">
        {/* モバイルヘッダー */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">ダッシュボードメニュー</SheetTitle>
              <SidebarContent
                pathname={pathname}
                onNavigate={() => setIsOpen(false)}
                userNickname={userNickname}
                userEmail={userEmail}
                loginProvider={loginProvider}
                onLogout={handleLogout}
              />
            </SheetContent>
          </Sheet>
          <Image
            src="/logo.png"
            alt="オシドリ"
            width={80}
            height={22}
            className="h-5 w-auto"
          />
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            管理
          </span>
          {/* モバイル: アカウントメニュー */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {userNickname && (
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {userNickname}
                  </div>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* コンテンツ */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
