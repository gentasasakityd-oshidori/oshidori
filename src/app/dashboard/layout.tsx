"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  UtensilsCrossed,
  Store,
  Mic,
  QrCode,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    href: "/dashboard/interview",
    label: "AIインタビュー",
    icon: Mic,
  },
  {
    href: "/dashboard/qrcode",
    label: "QRコード",
    icon: QrCode,
  },
];

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
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

      {/* フッター */}
      <div className="p-4">
        <Link
          href="/"
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* デスクトップサイドバー */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-warm-light md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent pathname={pathname} />
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
              <SidebarContent
                pathname={pathname}
                onNavigate={() => setIsOpen(false)}
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
        </header>

        {/* コンテンツ */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
