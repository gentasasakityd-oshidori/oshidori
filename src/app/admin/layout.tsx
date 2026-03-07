"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  Users,
  BookOpen,
  Sparkles,
  DollarSign,
  LogOut,
  Menu,
  X,
  Shield,
  FileText,
  BarChart3,
  Mic,
  Heart,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin", label: "KPIダッシュボード", icon: LayoutDashboard },
  { href: "/admin/shops", label: "店舗管理", icon: Store },
  { href: "/admin/users", label: "ユーザー管理", icon: Users },
  { href: "/admin/applications", label: "店舗権限申請", icon: FileText },
  { href: "/admin/stories", label: "ストーリー管理", icon: BookOpen },
  { href: "/admin/interviews", label: "AI品質管理", icon: Sparkles },
  { href: "/admin/ai-costs", label: "APIコスト", icon: DollarSign },
  { href: "/admin/empathy-analysis", label: "共感分析", icon: BarChart3 },
  { href: "/admin/interview-analysis", label: "インタビュー分析", icon: Mic },
  { href: "/admin/motivation-analysis", label: "動機データ分析", icon: Heart },
  { href: "/admin/logs", label: "操作ログ", icon: ScrollText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role, is_admin")
        .eq("id", user.id)
        .single();

      const p = profile as { role: string; is_admin: boolean } | null;
      const isAdmin = p?.role === "admin" || p?.is_admin === true;

      if (!isAdmin) {
        router.push("/home");
        return;
      }

      setIsAuthorized(true);
    }
    checkAdmin();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">認証確認中...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const isProduction = typeof window !== "undefined" && window.location.hostname === "oshidori.vercel.app";
  const envLabel = isProduction ? "本番" : "開発";
  const envColor = isProduction ? "bg-red-500" : "bg-amber-500";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* モバイルヘッダー */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary">オシドリ管理</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${envColor}`}>
            {envLabel}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* サイドバー */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 transform border-r bg-white transition-transform duration-200 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:block`}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary">オシドリ管理</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${envColor}`}>
            {envLabel}
          </span>
        </div>
        <nav className="mt-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-2">
          <div className="mb-2 px-3">
            <Link
              href="/home"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              ← 消費者サイトへ
            </Link>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-500"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </aside>

      {/* オーバーレイ（モバイル） */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 pt-14 md:pt-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
