"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  BookOpen,
  Mail,
  Sparkles,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ShopDetail = {
  shop: {
    id: string;
    name: string;
    slug: string;
    owner_name: string;
    area: string;
    category: string;
    is_published: boolean;
    created_at: string;
  };
  stories: { id: string; title: string; status: string; created_at: string }[];
  menus: { id: string; name: string; price: number; is_signature: boolean }[];
  oshi_count: number;
  oshi_fans: { user_id: string; created_at: string }[];
  empathy_total: number;
  empathy_tag_distribution: { tag: string; count: number }[];
  interviews: {
    id: string;
    status: string;
    current_phase: number;
    created_at: string;
    updated_at: string;
  }[];
  message_count: number;
};

export default function AdminShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ShopDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/shops/${id}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Ignore
      }
      setIsLoading(false);
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground">
        店舗が見つかりません
      </div>
    );
  }

  const { shop, stories, menus, oshi_count, empathy_total, empathy_tag_distribution, interviews, message_count } = data;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link href="/admin/shops">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            <Badge variant={shop.is_published ? "default" : "secondary"}>
              {shop.is_published ? (
                <><Eye className="mr-1 h-3 w-3" />公開中</>
              ) : (
                <><EyeOff className="mr-1 h-3 w-3" />非公開</>
              )}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {shop.owner_name} / {shop.area} / {shop.category}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            登録日: {new Date(shop.created_at).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shops/${shop.slug}`} target="_blank">
            <ExternalLink className="mr-1 h-3 w-3" />
            店舗ページ
          </Link>
        </Button>
      </div>

      {/* KPIサマリ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniCard
          icon={Heart}
          label="ファン数"
          value={oshi_count}
          color="text-red-600"
          bg="bg-red-50"
        />
        <MiniCard
          icon={MessageCircle}
          label="共感タップ数"
          value={empathy_total}
          color="text-pink-600"
          bg="bg-pink-50"
        />
        <MiniCard
          icon={BookOpen}
          label="ストーリー数"
          value={stories.length}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <MiniCard
          icon={Mail}
          label="メッセージ配信数"
          value={message_count}
          color="text-blue-600"
          bg="bg-blue-50"
        />
      </div>

      {/* 共感タグ分布 */}
      {empathy_tag_distribution.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">共感タグ分布（感情タグの分析）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {empathy_tag_distribution.map((item) => {
                const maxCount = empathy_tag_distribution[0].count;
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.tag} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm">
                      {item.tag}
                    </span>
                    <div className="flex-1">
                      <div className="h-5 rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-sm font-medium">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ストーリー一覧 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ストーリー一覧</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {stories.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              ストーリーはまだありません
            </p>
          ) : (
            stories.map((story) => (
              <div key={story.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium">{story.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(story.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <Badge
                  variant={story.status === "published" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {story.status === "published" ? "公開中" : "下書き"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* メニュー一覧 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">メニュー</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {menus.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              メニューはまだありません
            </p>
          ) : (
            menus.map((menu) => (
              <div key={menu.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium">{menu.name}</h4>
                </div>
                {menu.is_signature && (
                  <Badge variant="outline" className="text-xs">
                    看板メニュー
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {menu.price > 0 ? `¥${menu.price.toLocaleString()}` : "—"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* インタビュー履歴 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            AIインタビュー履歴
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {interviews.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              インタビュー記録はありません
            </p>
          ) : (
            interviews.map((iv) => (
              <div key={iv.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {new Date(iv.created_at).toLocaleDateString("ja-JP")} 開始
                  </p>
                  <p className="text-xs text-muted-foreground">
                    フェーズ {iv.current_phase}/6
                  </p>
                </div>
                <Badge
                  variant={iv.status === "completed" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {iv.status === "completed"
                    ? "完了"
                    : iv.status === "in_progress"
                      ? "進行中"
                      : iv.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}
        >
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
