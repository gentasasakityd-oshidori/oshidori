"use client";

import { useState } from "react";
import { Instagram, Globe, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "coming_soon";
  features: string[];
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Instagramの投稿写真・フォロワー数を自動取得し、店舗ページに表示",
    icon: <Instagram className="h-6 w-6" />,
    status: "coming_soon",
    features: [
      "最新投稿の自動取り込み",
      "フォロワー数の表示",
      "投稿写真の店舗ギャラリー連携",
      "エンゲージメント分析",
    ],
  },
  {
    id: "gbp",
    name: "Googleビジネスプロフィール",
    description: "Google検索・マップでの表示状況やクチコミを一元管理",
    icon: <Globe className="h-6 w-6" />,
    status: "coming_soon",
    features: [
      "営業時間の自動同期",
      "クチコミの一覧表示",
      "検索表示回数の分析",
      "写真の自動連携",
    ],
  },
];

export default function IntegrationsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#2C3E50]">外部サービス連携</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SNSやGoogleビジネスプロフィールと連携して、お店の情報を自動的に充実させましょう
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <Card
            key={integration.id}
            className={`transition-all ${
              integration.status === "connected"
                ? "border-green-200 bg-green-50/30"
                : "border-gray-200"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      integration.status === "connected"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {integration.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <StatusBadge status={integration.status} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {integration.description}
              </p>

              {/* 機能一覧 */}
              <div className="mt-3">
                <button
                  onClick={() => setExpandedId(expandedId === integration.id ? null : integration.id)}
                  className="text-xs text-primary hover:underline"
                >
                  {expandedId === integration.id ? "閉じる" : "連携でできること"}
                </button>
                {expandedId === integration.id && (
                  <ul className="mt-2 space-y-1.5">
                    {integration.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* アクションボタン */}
              <div className="mt-4">
                {integration.status === "connected" ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      設定を変更
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                      連携を解除
                    </Button>
                  </div>
                ) : integration.status === "coming_soon" ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled className="gap-1.5">
                      <ExternalLink className="h-3 w-3" />
                      準備中
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      近日対応予定です
                    </p>
                  </div>
                ) : (
                  <Button size="sm" className="gap-1.5">
                    <ExternalLink className="h-3 w-3" />
                    連携する
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 今後の連携予定 */}
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            今後、食べログ・ぐるなびなどとの連携も検討中です
          </p>
          <p className="mt-1 text-xs text-gray-400">
            ご要望があればお気軽にお知らせください
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: IntegrationConfig["status"] }) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="secondary" className="mt-1 gap-1 bg-green-100 text-green-700 text-[10px]">
          <CheckCircle2 className="h-2.5 w-2.5" />
          連携中
        </Badge>
      );
    case "coming_soon":
      return (
        <Badge variant="secondary" className="mt-1 gap-1 text-[10px]">
          <AlertCircle className="h-2.5 w-2.5" />
          準備中
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="mt-1 text-[10px]">
          未連携
        </Badge>
      );
  }
}
