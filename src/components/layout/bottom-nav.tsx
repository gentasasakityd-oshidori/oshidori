"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Search, Heart, CalendarCheck, User, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/home", label: "ホーム", icon: Compass },
  { href: "/explore", label: "さがす", icon: Search },
  { href: "/oshi", label: "推し店", icon: Heart },
  { href: "/reservations", label: "予約", icon: CalendarCheck },
  { href: "/mypage", label: "マイページ", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [isShopOwner, setIsShopOwner] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            const d = data as { role: string } | null;
            setIsShopOwner(d?.role === "shop_owner");
          });
      }
    });
  }, []);

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.href === "/mypage") {
      return pathname === "/mypage" || pathname.startsWith("/mypage/");
    }
    // 推し店タブは /diary ルートでもアクティブにする
    if (item.href === "/oshi") {
      return pathname === "/oshi" || pathname.startsWith("/oshi/") || pathname.startsWith("/diary");
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                active
                  ? "text-[#E06A4E]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
              <span className={active ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
        {/* shop_ownerの場合、店舗管理への切り替えボタンを追加 */}
        {isShopOwner && (
          <Link
            href="/dashboard"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-primary transition-colors hover:text-primary/80"
          >
            <Store className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-medium">管理</span>
          </Link>
        )}
      </div>
      {/* Safe area padding for notch devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
