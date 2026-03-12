"use client";

import { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  Loader2,
  BookOpen,
  Newspaper,
  Zap,
  Mail,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

// ── 型定義 ──

type ContentItem = {
  id: string;
  type: "story" | "update" | "flash";
  title: string;
  body: string;
  shop_name: string;
  shop_slug: string;
  created_at: string;
  url: string;
};

type SNSPlatform = "x" | "facebook" | "line" | "email" | "copy";

// ── SNS共有ヘルパー ──

function getShareUrl(platform: SNSPlatform, url: string, text: string): string | null {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  switch (platform) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    case "line":
      return `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent(text.split("\n")[0])}&body=${encodedText}%0A%0A${encodedUrl}`;
    default:
      return null;
  }
}

function generateShareText(item: ContentItem): string {
  const shopName = item.shop_name;
  switch (item.type) {
    case "story":
      return `${item.title}｜${shopName}\n\n${item.body.slice(0, 100)}...`;
    case "update":
      return `${shopName}の近況\n\n${item.body.slice(0, 140)}`;
    case "flash":
      return `【${shopName}】${item.title}\n\n${item.body.slice(0, 100)}`;
  }
}

const TYPE_CONFIG = {
  story: { icon: BookOpen, label: "ストーリー", color: "bg-primary/10 text-primary" },
  update: { icon: Newspaper, label: "近況更新", color: "bg-blue-50 text-blue-700" },
  flash: { icon: Zap, label: "在庫速報", color: "bg-orange-50 text-orange-700" },
} as const;

const PLATFORMS: { key: SNSPlatform; label: string; icon: React.ReactNode; color: string }[] = [
  {
    key: "x",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "hover:bg-gray-100",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "hover:bg-blue-50",
  },
  {
    key: "line",
    label: "LINE",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#06C755">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    ),
    color: "hover:bg-green-50",
  },
  {
    key: "email",
    label: "メール",
    icon: <Mail className="h-4 w-4" />,
    color: "hover:bg-gray-100",
  },
  {
    key: "copy",
    label: "URLコピー",
    icon: <Copy className="h-4 w-4" />,
    color: "hover:bg-gray-100",
  },
];

// ── 共有メニューコンポーネント ──

function ShareMenu({
  item,
  isOpen,
  onToggle,
}: {
  item: ContentItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare(platform: SNSPlatform) {
    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(item.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      return;
    }

    // Navigator Share APIを試す（モバイル向け）
    if (platform === "x" && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: generateShareText(item),
          url: item.url,
        });
        return;
      } catch {
        // ユーザーキャンセル、フォールバック
      }
    }

    const shareUrl = getShareUrl(platform, item.url, generateShareText(item));
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onToggle}>
        <Share2 className="h-3.5 w-3.5" />
        共有
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-background p-1.5 shadow-lg">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => handleShare(p.key)}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${p.color}`}
              >
                {p.key === "copy" && copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  p.icon
                )}
                <span>{p.key === "copy" && copied ? "コピー済み" : `${p.label}で共有`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── SNSプレビューカード ──

function SNSPreviewCard({ item, platform }: { item: ContentItem; platform: "instagram" | "x" | "facebook" }) {
  const text = generateShareText(item);
  const date = new Date(item.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });

  if (platform === "instagram") {
    return (
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{item.shop_name[0]}</span>
          </div>
          <span className="text-xs font-semibold">{item.shop_name}</span>
        </div>
        <div className="h-20 bg-gradient-to-br from-warm to-primary/10 flex items-center justify-center">
          <span className="text-2xl">📸</span>
        </div>
        <div className="px-3 py-2">
          <p className="text-[11px] leading-relaxed line-clamp-3">{text}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{date}</p>
        </div>
      </div>
    );
  }

  if (platform === "x") {
    return (
      <div className="rounded-lg border bg-white p-3">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold">{item.shop_name[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold truncate">{item.shop_name}</span>
              <span className="text-[10px] text-muted-foreground">· {date}</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed line-clamp-3">{text.slice(0, 140)}</p>
            {item.url && (
              <div className="mt-1.5 rounded border bg-gray-50 p-1.5">
                <p className="text-[10px] text-muted-foreground truncate">{item.url}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Facebook
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-700">{item.shop_name[0]}</span>
        </div>
        <div>
          <span className="text-xs font-semibold">{item.shop_name}</span>
          <p className="text-[10px] text-muted-foreground">{date} · 🌐</p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-[11px] leading-relaxed line-clamp-4">{text}</p>
      </div>
      <div className="border-t px-3 py-1.5 flex gap-4">
        <span className="text-[10px] text-muted-foreground">👍 いいね</span>
        <span className="text-[10px] text-muted-foreground">💬 コメント</span>
        <span className="text-[10px] text-muted-foreground">↗ シェア</span>
      </div>
    </div>
  );
}

// ── メインページ ──

type FilterTab = "all" | "story" | "update" | "flash";

export default function SNSHubPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContents() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: shops } = await supabase
          .from("shops")
          .select("id, name, slug")
          .eq("owner_id", user.id);

        if (!shops || shops.length === 0) return;

        const shopIds = shops.map((s: { id: string }) => s.id);
        const items: ContentItem[] = [];

        // ストーリー取得
        const { data: stories } = await supabase
          .from("stories")
          .select("id, title, summary, shop_id, created_at")
          .in("shop_id", shopIds)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(20);

        for (const s of stories || []) {
          const story = s as { id: string; title: string; summary: string; shop_id: string; created_at: string };
          const shop = (shops as { id: string; name: string; slug: string }[]).find(
            (sh) => sh.id === story.shop_id
          );
          if (shop) {
            items.push({
              id: `story-${story.id}`,
              type: "story",
              title: story.title,
              body: story.summary,
              shop_name: shop.name,
              shop_slug: shop.slug,
              created_at: story.created_at,
              url: `https://oshidori.vercel.app/shops/${shop.slug}`,
            });
          }
        }

        // 近況更新取得
        const { data: updates } = await supabase
          .from("shop_updates")
          .select("id, content, shop_id, created_at")
          .in("shop_id", shopIds)
          .order("created_at", { ascending: false })
          .limit(10);

        for (const u of updates || []) {
          const update = u as { id: string; content: string; shop_id: string; created_at: string };
          const shop = (shops as { id: string; name: string; slug: string }[]).find(
            (sh) => sh.id === update.shop_id
          );
          if (shop) {
            items.push({
              id: `update-${update.id}`,
              type: "update",
              title: "近況更新",
              body: update.content,
              shop_name: shop.name,
              shop_slug: shop.slug,
              created_at: update.created_at,
              url: `https://oshidori.vercel.app/shops/${shop.slug}`,
            });
          }
        }

        // 在庫速報取得
        const { data: flashes } = await supabase
          .from("supply_flash_posts")
          .select("id, title, description, shop_id, created_at")
          .in("shop_id", shopIds)
          .order("created_at", { ascending: false })
          .limit(10);

        for (const f of flashes || []) {
          const flash = f as { id: string; title: string; description: string | null; shop_id: string; created_at: string };
          const shop = (shops as { id: string; name: string; slug: string }[]).find(
            (sh) => sh.id === flash.shop_id
          );
          if (shop) {
            items.push({
              id: `flash-${flash.id}`,
              type: "flash",
              title: flash.title,
              body: flash.description || flash.title,
              shop_name: shop.name,
              shop_slug: shop.slug,
              created_at: flash.created_at,
              url: `https://oshidori.vercel.app/shops/${shop.slug}`,
            });
          }
        }

        // 日時順ソート
        items.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setContents(items);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchContents();
  }, []);

  const filteredContents = contents.filter((c) => {
    if (filter === "all") return true;
    return c.type === filter;
  });

  const typeCounts = {
    all: contents.length,
    story: contents.filter((c) => c.type === "story").length,
    update: contents.filter((c) => c.type === "update").length,
    flash: contents.filter((c) => c.type === "flash").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">SNS配信ハブ</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          コンテンツの「共有」ボタンからSNS各種・メール・URLコピーで簡単にシェア
        </p>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-2 border-b">
        {(
          [
            { key: "all" as FilterTab, label: "すべて" },
            { key: "story" as FilterTab, label: "ストーリー" },
            { key: "update" as FilterTab, label: "近況更新" },
            { key: "flash" as FilterTab, label: "在庫速報" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {typeCounts[tab.key] > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">
                {typeCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* コンテンツ一覧 */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredContents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              共有可能なコンテンツがまだありません。
              <br />
              ストーリーや近況更新を投稿すると、ここから共有できます。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredContents.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            const isPreviewOpen = previewId === item.id;

            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${config.color}`}
                        >
                          <Icon className="mr-0.5 h-2.5 w-2.5" />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {item.body}
                      </p>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setPreviewId(isPreviewOpen ? null : item.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isPreviewOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                      <ShareMenu
                        item={item}
                        isOpen={openShareId === item.id}
                        onToggle={() =>
                          setOpenShareId(openShareId === item.id ? null : item.id)
                        }
                      />
                    </div>
                  </div>

                  {/* SNSプレビュー展開エリア */}
                  {isPreviewOpen && (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-3 text-xs font-medium text-muted-foreground">SNSプレビュー</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="mb-1.5 text-[10px] font-medium text-center text-muted-foreground">Instagram</p>
                          <SNSPreviewCard item={item} platform="instagram" />
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] font-medium text-center text-muted-foreground">X (Twitter)</p>
                          <SNSPreviewCard item={item} platform="x" />
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] font-medium text-center text-muted-foreground">Facebook</p>
                          <SNSPreviewCard item={item} platform="facebook" />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
