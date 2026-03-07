"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  UtensilsCrossed,
  Store,
  Mic,
  QrCode,
  MessageCircle,
  Users,
  Camera,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  User,
  CalendarClock,
  Megaphone,
  Share2,
  Plug,
  Crown,
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

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/stories",
    label: "ストーリー管理",
    icon: BookOpen,
  },
  {
    href: "/dashboard/menus",
    label: "食べてほしい一品",
    icon: UtensilsCrossed,
  },
  {
    href: "/dashboard/shop",
    label: "店舗情報",
    icon: Store,
  },
  {
    href: "/dashboard/messages",
    label: "メッセージ配信",
    icon: MessageCircle,
  },
  {
    href: "/dashboard/fans",
    label: "ファン一覧",
    icon: Users,
  },
  {
    href: "/dashboard/fan-club",
    label: "ファンクラブ運営",
    icon: Crown,
  },
  {
    href: "/dashboard/photos",
    label: "写真撮影",
    icon: Camera,
  },
  {
    href: "/dashboard/reservations",
    label: "予約打診管理",
    icon: CalendarClock,
  },
  {
    href: "/dashboard/updates",
    label: "近況更新",
    icon: Megaphone,
  },
  {
    href: "/dashboard/sns-hub",
    label: "SNS配信ハブ",
    icon: Share2,
  },
  {
    href: "/dashboard/interview",
    label: "AIインタビュー",
    icon: Mic,
  },
  {
    href: "/dashboard/qrcode",
    label: "QRコード",
    icon: QrCode,
  },
  {
    href: "/dashboard/integrations",
    label: "外部連携",
    icon: Plug,
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
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-warm hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
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
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={onNavigate}
        >
          <ChevronLeft className="h-4 w-4" />
          サイトに戻る
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
