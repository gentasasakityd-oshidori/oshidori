"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Eye,
  Edit2,
  MessageCircle,
  MoreHorizontal,
  Globe,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const DUMMY_STORIES = [
  {
    id: "1",
    title: "祖父から受け継いだ石臼と、朝4時の仕込み",
    type: "main" as const,
    status: "published" as const,
    publishedAt: "2026-02-20",
    pv: 382,
    empathy: 45,
    excerpt:
      "東京の下町、蔵前。朝4時、まだ街が眠る中、一軒のそば屋に灯りがともる...",
  },
  {
    id: "2",
    title: "常連の田中さんが教えてくれた「いつもの」の重さ",
    type: "episode" as const,
    status: "published" as const,
    publishedAt: "2026-02-25",
    pv: 156,
    empathy: 18,
    excerpt:
      "開店から3年、毎週木曜日に来てくれる田中さんという常連がいる...",
  },
  {
    id: "3",
    title: "新しい蕎麦の可能性 ー 十割蕎麦へのこだわり",
    type: "kodawari" as const,
    status: "draft" as const,
    publishedAt: null,
    pv: 0,
    empathy: 0,
    excerpt:
      "蕎麦の風味を最大限に活かすには、十割蕎麦しかないと私は考えている...",
  },
];

const TYPE_LABELS: Record<string, string> = {
  main: "メインストーリー",
  episode: "エピソード",
  kodawari: "こだわり",
};

export default function StoriesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ストーリー管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            お店のストーリーを管理・編集できます
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/interview">
            <Plus className="h-4 w-4" />
            新しいストーリー
          </Link>
        </Button>
      </div>

      {/* ストーリー一覧 */}
      <div className="space-y-4">
        {DUMMY_STORIES.map((story) => (
          <Card key={story.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                {/* サムネイル */}
                <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-warm to-secondary sm:h-auto sm:w-40">
                  <BookOpen className="h-8 w-8 text-primary/40" />
                </div>

                {/* コンテンツ */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          story.status === "published" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {story.status === "published" ? (
                          <>
                            <Globe className="mr-1 h-3 w-3" />
                            公開中
                          </>
                        ) : (
                          <>
                            <FileText className="mr-1 h-3 w-3" />
                            下書き
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[story.type] ?? story.type}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="mt-2 font-semibold leading-snug">
                    {story.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {story.excerpt}
                  </p>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {story.status === "published" && (
                        <>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {story.pv} PV
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {story.empathy} 共感
                          </span>
                          <span>{story.publishedAt} 公開</span>
                        </>
                      )}
                      {story.status === "draft" && (
                        <span>下書き保存中</span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Edit2 className="h-3 w-3" />
                      編集
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ヒント */}
      <Card className="border-primary/20 bg-warm">
        <CardContent className="p-4">
          <p className="text-sm">
            <strong className="text-primary">ヒント：</strong>
            新しいストーリーはAIインタビューから生成されます。
            「新しいストーリー」ボタンからインタビューを開始してください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
