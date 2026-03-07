"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check, Instagram, MessageCircle, Settings, Clock, Link as LinkIcon } from "lucide-react";
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

interface AutoPublishSettings {
  instagram: boolean;
  x: boolean;
  gbp: boolean;
  delay_minutes: number;
  auto_link: boolean;
}

const DEFAULT_AUTO_PUBLISH: AutoPublishSettings = {
  instagram: false,
  x: false,
  gbp: false,
  delay_minutes: 30,
  auto_link: true,
};

const DELAY_OPTIONS = [
  { value: 0, label: "即時" },
  { value: 15, label: "15分後" },
  { value: 30, label: "30分後" },
  { value: 60, label: "1時間後" },
  { value: 120, label: "2時間後" },
];

export default function SNSHubPage() {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [selectedStory, setSelectedStory] = useState<StoryData | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SNSFormat>("instagram");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  // 自動配信設定
  const [autoPublish, setAutoPublish] = useState<AutoPublishSettings>(DEFAULT_AUTO_PUBLISH);
  const [autoPublishSaving, setAutoPublishSaving] = useState(false);
  const [autoPublishSaved, setAutoPublishSaved] = useState(false);

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

        // 自動配信設定の読み込み（shopのmetadataから）
        const firstShopId = (shops[0] as { id: string }).id;
        if (firstShopId) {
          const { data: shopMeta } = await supabase
            .from("shops")
            .select("metadata")
            .eq("id", firstShopId)
            .single();
          const metaObj = shopMeta as { metadata?: Record<string, unknown> | null } | null;
          if (metaObj?.metadata && typeof metaObj.metadata === "object") {
            const meta = metaObj.metadata;
            if (meta.auto_publish && typeof meta.auto_publish === "object") {
              setAutoPublish({ ...DEFAULT_AUTO_PUBLISH, ...(meta.auto_publish as Partial<AutoPublishSettings>) });
            }
          }
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

  async function handleSaveAutoPublish() {
    setAutoPublishSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: shops } = await supabase
        .from("shops")
        .select("id, metadata")
        .eq("owner_id", user.id)
        .limit(1);

      if (!shops || shops.length === 0) return;

      const shop = shops[0] as { id: string; metadata?: Record<string, unknown> | null };
      const existingMeta = (shop.metadata && typeof shop.metadata === "object" ? shop.metadata : {}) as Record<string, unknown>;
      const updatedMeta = { ...existingMeta, auto_publish: autoPublish };

      await supabase
        .from("shops")
        .update({ metadata: updatedMeta } as never)
        .eq("id", shop.id);

      setAutoPublishSaved(true);
      setTimeout(() => setAutoPublishSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setAutoPublishSaving(false);
    }
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

      {/* 自動配信設定 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            自動配信設定
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ストーリー公開時にSNSへ自動配信する設定です。実際のSNS連携は今後のアップデートで対応予定です。
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* プラットフォーム選択 */}
          <div>
            <p className="text-sm font-medium text-[#2C3E50] mb-3">配信先プラットフォーム</p>
            <div className="space-y-2.5">
              {([
                { key: "instagram" as const, label: "Instagram", icon: <Instagram className="h-4 w-4" /> },
                { key: "x" as const, label: "X (Twitter)", icon: <span className="text-sm font-bold">𝕏</span> },
                { key: "gbp" as const, label: "Googleビジネスプロフィール", icon: <span className="text-sm">📍</span> },
              ]).map((platform) => (
                <label
                  key={platform.key}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {platform.icon}
                    <span className="text-sm">{platform.label}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={autoPublish[platform.key]}
                      onChange={(e) =>
                        setAutoPublish((prev) => ({ ...prev, [platform.key]: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-[#E06A4E] transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 配信遅延時間 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-medium text-[#2C3E50]">配信タイミング</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              オシドリでストーリー公開後、何分後に自動配信するか
            </p>
            <div className="flex flex-wrap gap-2">
              {DELAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAutoPublish((prev) => ({ ...prev, delay_minutes: opt.value }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    autoPublish.delay_minutes === opt.value
                      ? "bg-[#E06A4E] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* オシドリリンク自動付与 */}
          <label className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <LinkIcon className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-sm font-medium text-[#2C3E50]">オシドリリンクを自動付与</span>
                <p className="text-[11px] text-muted-foreground">投稿にストーリーページのURLを含めます</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={autoPublish.auto_link}
                onChange={(e) =>
                  setAutoPublish((prev) => ({ ...prev, auto_link: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-[#E06A4E] transition-colors" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </div>
          </label>

          {/* 保存ボタン */}
          <Button
            onClick={handleSaveAutoPublish}
            disabled={autoPublishSaving}
            className="w-full bg-[#E06A4E] hover:bg-[#d0593d]"
          >
            {autoPublishSaved ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                保存しました
              </>
            ) : autoPublishSaving ? (
              "保存中..."
            ) : (
              "設定を保存"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
