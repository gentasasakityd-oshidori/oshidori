"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check, Instagram, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface StoryData {
  id: string;
  title: string;
  summary: string;
  catchcopy_primary: string | null;
  hook_sentence: string | null;
  body: string;
  shop: { name: string; slug: string } | null;
}

type SNSFormat = "instagram" | "x" | "gbp" | "line";

const FORMAT_LABELS: Record<SNSFormat, string> = {
  instagram: "Instagram",
  x: "X (Twitter)",
  gbp: "Googleビジネスプロフィール",
  line: "LINE",
};

function generateSNSText(story: StoryData, format: SNSFormat): string {
  const shopName = story.shop?.name ?? "お店";
  const slug = story.shop?.slug ?? "";
  const url = `https://oshidori.vercel.app/shops/${slug}`;
  const catchcopy = story.catchcopy_primary ?? story.title;
  const hook = story.hook_sentence ?? story.summary;

  switch (format) {
    case "instagram":
      return `${catchcopy}\n\n${hook}\n\n${shopName}のストーリーを読む\n${url}\n\n#オシドリ #${shopName.replace(/\s/g, "")} #こだわりの店 #推し店`;
    case "x":
      return `${catchcopy}｜${shopName}\n\n${hook.slice(0, 80)}...\n\n${url} #オシドリ`;
    case "gbp":
      return `${shopName}のこだわりストーリー\n\n${hook}\n\n詳しくはオシドリで ▶ ${url}`;
    case "line":
      return `【${shopName}】\n${catchcopy}\n\n${hook}\n\n▶ ストーリーを読む\n${url}`;
  }
}

export default function SNSHubPage() {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [selectedStory, setSelectedStory] = useState<StoryData | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SNSFormat>("instagram");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStories() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // ユーザーの店舗のストーリーを取得
        const { data: shops } = await supabase
          .from("shops")
          .select("id, name, slug")
          .eq("owner_id", user.id);

        if (!shops || shops.length === 0) return;

        const shopIds = shops.map((s: { id: string }) => s.id);
        const { data: storiesData } = await supabase
          .from("stories")
          .select("id, title, summary, catchcopy_primary, hook_sentence, body, shop_id")
          .in("shop_id", shopIds)
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (storiesData) {
          const mapped = storiesData.map((s: {
            id: string; title: string; summary: string;
            catchcopy_primary: string | null; hook_sentence: string | null;
            body: string; shop_id: string;
          }) => ({
            ...s,
            shop: (shops.find((sh: { id: string }) => sh.id === s.shop_id) ?? null) as { name: string; slug: string } | null,
          }));
          setStories(mapped);
          if (mapped.length > 0) setSelectedStory(mapped[0]);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, []);

  function handleCopy() {
    if (!selectedStory) return;
    const text = generateSNSText(selectedStory, selectedFormat);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const templates = [
    { type: "story" as const, label: "ストーリー投稿", description: "メインストーリーのSNS配信用テキスト" },
    { type: "menu" as const, label: "メニュー紹介", description: "食べてほしい一品の紹介テキスト" },
    { type: "update" as const, label: "近況更新", description: "近況更新のSNS配信テキスト" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">SNS配信ハブ</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        ストーリーをSNS向けのテキストに自動変換。ワンタップでコピーして投稿できます。
      </p>

      {/* 配信テンプレート */}
      <div className="grid gap-3 sm:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.type} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <h3 className="font-semibold">{t.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">読み込み中...</p>
      ) : stories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              公開済みのストーリーがありません。
              <br />
              AIインタビューでストーリーを作成してください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ストーリー選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ストーリーを選択</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => setSelectedStory(story)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedStory?.id === story.id
                      ? "border-primary bg-warm"
                      : "border-border hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-medium">{story.catchcopy_primary ?? story.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{story.shop?.name}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* SNS変換 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SNS用テキスト生成</CardTitle>
            </CardHeader>
            <CardContent>
              {/* フォーマット選択 */}
              <div className="flex flex-wrap gap-2">
                {(Object.entries(FORMAT_LABELS) as [SNSFormat, string][]).map(([key, label]) => (
                  <Badge
                    key={key}
                    variant={selectedFormat === key ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedFormat(key)}
                  >
                    {key === "instagram" && <Instagram className="mr-1 h-3 w-3" />}
                    {key === "line" && <MessageCircle className="mr-1 h-3 w-3" />}
                    {label}
                  </Badge>
                ))}
              </div>

              {/* プレビュー */}
              {selectedStory && (
                <div className="mt-4">
                  <pre className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-4 text-sm leading-relaxed">
                    {generateSNSText(selectedStory, selectedFormat)}
                  </pre>
                  <Button
                    onClick={handleCopy}
                    className="mt-3 w-full"
                    variant={copied ? "outline" : "default"}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        コピーしました！
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" />
                        テキストをコピー
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
