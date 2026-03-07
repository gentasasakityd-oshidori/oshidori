"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Megaphone,
  UtensilsCrossed,
  Camera,
  Share2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ContentSection = "stories" | "updates" | "menus" | "photos" | "sns";

const CONTENT_SECTIONS: {
  id: ContentSection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  emoji: string;
}[] = [
  {
    id: "stories",
    label: "ストーリー管理",
    description: "AIが引き出したお店の魅力を編集・公開",
    icon: BookOpen,
    href: "/dashboard/stories",
    emoji: "📚",
  },
  {
    id: "updates",
    label: "近況更新",
    description: "推し登録してくれたお客さんに最新情報をお届け",
    icon: Megaphone,
    href: "/dashboard/updates",
    emoji: "📝",
  },
  {
    id: "menus",
    label: "食べてほしい一品",
    description: "こだわりのメニューを登録・編集",
    icon: UtensilsCrossed,
    href: "/dashboard/menus",
    emoji: "🍽️",
  },
  {
    id: "photos",
    label: "写真撮影",
    description: "お店の魅力を伝える写真を管理",
    icon: Camera,
    href: "/dashboard/photos",
    emoji: "📸",
  },
  {
    id: "sns",
    label: "SNS自動投稿設定",
    description: "ストーリーをSNS向けに変換・自動配信",
    icon: Share2,
    href: "/dashboard/sns-hub",
    emoji: "📱",
  },
];

export default function ContentPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          📖 コンテンツ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          お店の魅力を発信するためのすべての機能がここにあります
        </p>
      </div>

      <div className="space-y-3">
        {CONTENT_SECTIONS.map((section) => (
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
