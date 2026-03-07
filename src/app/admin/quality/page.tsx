"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Heart,
  MessageCircle,
  BookOpen,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ShopQuality = {
  id: string;
  name: string;
  slug: string;
  oshi_count: number;
  empathy_count: number;
  visit_count: number;
  letter_count: number;
  score: number;
  flags: string[];
  last_updated: string;
};

type QualityData = {
  shops: ShopQuality[];
  summary: {
    total: number;
    needs_attention: number;
    avg_score: number;
  };
};

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  long_inactive: { label: "30日以上更新なし", color: "bg-yellow-100 text-yellow-800" },
  no_engagement: { label: "来店・レターなし", color: "bg-orange-100 text-orange-800" },
  no_published_story: { label: "ストーリー未公開", color: "bg-red-100 text-red-800" },
};

export default function AdminQualityPage() {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "last_updated">("score");
  const [showFlagged, setShowFlagged] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/quality");
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground">
        データの読み込みに失敗しました
      </div>
    );
  }

  // ソートとフィルタ
  let shops = [...data.shops];
  if (showFlagged) {
    shops = shops.filter((s) => s.flags.length > 0);
  }
  if (sortBy === "last_updated") {
    shops.sort(
      (a, b) =>
        new Date(b.last_updated).getTime() -
        new Date(a.last_updated).getTime()
    );
  }
  // score はデフォルトでAPIから降順

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-blue-600" />
          品質シグナル
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          掲載店舗のエンゲージメント品質を一覧管理
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">公開店舗数</p>
            <p className="text-3xl font-bold text-[#2C3E50]">
              {data.summary.total}
            </p>
          </CardContent>
        </Card>
        <Card className={data.summary.needs_attention > 0 ? "border-orange-200" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">要確認</p>
            <p className={`text-3xl font-bold ${data.summary.needs_attention > 0 ? "text-orange-600" : "text-green-600"}`}>
              {data.summary.needs_attention}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">平均スコア</p>
            <p className="text-3xl font-bold text-[#2C3E50]">
              {data.summary.avg_score}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* フィルタ・ソート */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant={showFlagged ? "default" : "outline"}
          onClick={() => setShowFlagged(!showFlagged)}
          className="gap-1 text-xs"
        >
          <AlertTriangle className="h-3 w-3" />
          要確認のみ ({data.summary.needs_attention})
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setSortBy((prev) =>
              prev === "score" ? "last_updated" : "score"
            )
          }
          className="gap-1 text-xs"
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBy === "score" ? "スコア順" : "更新日順"}
        </Button>
      </div>

      {/* 店舗テーブル */}
      {shops.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {showFlagged
              ? "要確認の店舗はありません"
              : "公開中の店舗がありません"}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    店舗名
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500">
                    <Heart className="mx-auto h-3.5 w-3.5" />
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500">
                    <MessageCircle className="mx-auto h-3.5 w-3.5" />
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500">
                    <BookOpen className="mx-auto h-3.5 w-3.5" />
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500">
                    <Mail className="mx-auto h-3.5 w-3.5" />
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-gray-500">
                    スコア
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/shops/${shop.slug}`}
                        className="flex items-center gap-1.5 font-medium text-[#2C3E50] hover:text-[#E06A4E] transition-colors"
                      >
                        {shop.name}
                        <ExternalLink className="h-3 w-3 text-gray-300" />
                      </Link>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        最終更新:{" "}
                        {new Date(shop.last_updated).toLocaleDateString(
                          "ja-JP"
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {shop.oshi_count}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {shop.empathy_count}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {shop.visit_count}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">
                      {shop.letter_count}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          shop.score >= 20
                            ? "bg-green-100 text-green-700"
                            : shop.score >= 5
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {shop.score}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {shop.flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {shop.flags.map((flag) => {
                            const info = FLAG_LABELS[flag];
                            return info ? (
                              <Badge
                                key={flag}
                                variant="secondary"
                                className={`text-[10px] ${info.color}`}
                              >
                                {info.label}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-green-500">
                          <CheckCircle2 className="inline h-3.5 w-3.5" /> 正常
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 凡例 */}
      <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-medium mb-1.5">テーブル凡例</p>
        <div className="grid gap-1 sm:grid-cols-2">
          <p>
            <Heart className="inline h-3 w-3" /> 推し数 ×3 +{" "}
            <MessageCircle className="inline h-3 w-3" /> 共感 ×1 +{" "}
            <BookOpen className="inline h-3 w-3" /> 来店 ×2 +{" "}
            <Mail className="inline h-3 w-3" /> レター ×5 = スコア
          </p>
          <p>
            スコア 20以上: 🟢 / 5以上: 🔵 / 5未満: ⚪
          </p>
        </div>
      </div>
    </div>
  );
}
