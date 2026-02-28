"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Sparkles,
  UtensilsCrossed,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RecommendedItem = {
  id: string;
  name: string;
  price: number | null;
  description: string;
  owner_message: string;
  source: "interview" | "manual";
};

const INITIAL_ITEMS: RecommendedItem[] = [
  {
    id: "1",
    name: "十割そば",
    price: 1200,
    description: "石臼挽き自家製粉の十割そば。毎朝の手打ちで提供。",
    owner_message:
      "まずはこれだけを食べてほしい。祖父の石臼で挽いた十割そばを、何もつけずにひと口。小麦粉でごまかしていない、そば本来の甘みと香りがわかるはずです。つゆは本枯節と利尻昆布の一番出汁。そばをちょっとだけつけて、すすってください。",
    source: "interview",
  },
  {
    id: "2",
    name: "鴨南蛮そば",
    price: 1600,
    description: "冬季限定・千葉県産合鴨使用",
    owner_message:
      "冬だけのお楽しみ。千葉の農家さんから直接仕入れる合鴨は、脂に甘みがあって、温かいそばつゆとの相性が抜群なんです。父の代から「冬はこれ」と決めている一品。",
    source: "interview",
  },
];

export default function MenusPage() {
  const [items] = useState<RecommendedItem[]>(INITIAL_ITEMS);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">食べてほしい一品</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AIインタビューから生成された「おすすめの一品」を管理できます
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          一品を追加
        </Button>
      </div>

      {/* 説明カード */}
      <Card className="border-primary/20 bg-warm">
        <CardContent className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">
              AIインタビューから自動生成されます
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              インタビューの「食べてほしい一品」フェーズでお話しいただいた内容から、あなたの想いを込めたメニュー紹介を自動で作成します。手動で追加・編集することもできます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 一品リスト */}
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary/20" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <Badge
                      variant={item.source === "interview" ? "default" : "outline"}
                      className="text-xs"
                    >
                      {item.source === "interview" ? (
                        <>
                          <Sparkles className="mr-1 h-3 w-3" />
                          AI生成
                        </>
                      ) : (
                        "手動追加"
                      )}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    {item.price && (
                      <span className="text-sm font-medium text-primary">
                        ¥{item.price.toLocaleString()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* オーナーメッセージプレビュー */}
              <div className="mt-3 rounded-lg border border-primary/10 bg-warm-light p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    お客さまに届くメッセージ
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/85">
                  {item.owner_message}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状態 */}
      {items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 font-medium">
              まだ「食べてほしい一品」がありません
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              AIインタビューを受けると、お話の中から自動で生成されます
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild>
                <a href="/dashboard/interview">AIインタビューを受ける</a>
              </Button>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                手動で追加
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
