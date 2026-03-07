"use client";

import Link from "next/link";
import {
  Store,
  QrCode,
  Plug,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SETTINGS_SECTIONS = [
  {
    id: "shop",
    label: "基本情報",
    description: "店舗名、住所、営業時間などの基本情報を編集",
    icon: Store,
    href: "/dashboard/shop",
    emoji: "📋",
  },
  {
    id: "qrcode",
    label: "QRコード",
    description: "チェックイン用QRコードの表示・印刷",
    icon: QrCode,
    href: "/dashboard/qrcode",
    emoji: "📱",
  },
  {
    id: "integrations",
    label: "外部連携",
    description: "Instagram・X・Googleビジネスプロフィールとの連携設定",
    icon: Plug,
    href: "/dashboard/integrations",
    emoji: "🔗",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          🏪 店舗設定
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          店舗の基本情報やQRコード、外部連携の設定
        </p>
      </div>

      <div className="space-y-3">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="group block"
          >
            <Card className="transition-all hover:shadow-md hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                    {section.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#2C3E50] group-hover:text-primary transition-colors">
                      {section.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
