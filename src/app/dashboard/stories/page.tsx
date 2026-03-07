"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Eye,
  Edit2,
  MessageCircle,
  Globe,
  FileText,
  Loader2,
  Save,
  X,
  Check,
  Share2,
  Copy,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type StoryRow = {
  id: string;
  shop_id: string;
  title: string;
  body: string;
  summary: string | null;
  key_quotes: string[] | null;
  emotion_tags: string[] | null;
  story_themes: string[] | null;
  status: string;
  published_at: string | null;
  created_at: string;
};

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ストーリー修正プリセット
  const EDIT_PRESETS = [
    { icon: "✂️", label: "もっと短くまとめて", prompt: "ストーリーをもっと簡潔に、核心だけを伝える短いバージョンにしてください。" },
    { icon: "📝", label: "もう少し詳しく", prompt: "エピソードや具体的なこだわりの描写をもう少し詳しく書き足してください。" },
    { icon: "💝", label: "お客さまへの想いを強調", prompt: "お客さまへのおもてなしの気持ちや、来てくれる人への感謝をもっと前面に出してください。" },
    { icon: "🍳", label: "食材のこだわりを強調", prompt: "食材の仕入れや調理法、素材へのこだわりをもっと強調してください。" },
    { icon: "💬", label: "カジュアルな言葉に", prompt: "もう少し親しみやすく、カジュアルな口調でリライトしてください。堅くなりすぎないように。" },
  ] as const;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/stories");
        if (!res.ok) {
          setError(res.status === 401 ? "ログインが必要です" : "データの読み込みに失敗しました");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setStories(data.stories ?? []);
      } catch {
        setError("ネットワークエラーが発生しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleStatusToggle(story: StoryRow) {
    const newStatus = story.status === "published" ? "draft" : "published";
    setError(null);
    try {
      const res = await fetch("/api/dashboard/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: story.id, status: newStatus }),
      });
      if (!res.ok) {
        setError("ステータスの更新に失敗しました");
        return;
      }
      const data = await res.json();
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? (data.story as StoryRow) : s))
      );
    } catch {
      setError("ネットワークエラーが発生しました");
    }
  }

  function startEdit(story: StoryRow) {
    setEditingId(story.id);
    setEditTitle(story.title);
    setEditBody(story.body);
    setEditSummary(story.summary ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: editingId,
          title: editTitle,
          body: editBody,
          summary: editSummary || null,
        }),
      });
      if (!res.ok) {
        setError("ストーリーの保存に失敗しました");
        setIsSaving(false);
        return;
      }
      const data = await res.json();
      setStories((prev) =>
        prev.map((s) => (s.id === editingId ? (data.story as StoryRow) : s))
      );
      setEditingId(null);
    } catch {
      setError("ネットワークエラーが発生しました");
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ストーリー一覧 */}
      {stories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="font-semibold">まだストーリーがありません</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AIインタビューを受けて、お店のストーリーを作りましょう
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/interview">
                <Plus className="mr-2 h-4 w-4" />
                インタビューを始める
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <Card key={story.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* 編集モード */}
                {editingId === story.id ? (
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">
                        ストーリーを編集
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="mr-1 h-3 w-3" />
                        キャンセル
                      </Button>
                    </div>
                    <div>
                      <label htmlFor="edit-title" className="text-xs font-medium text-muted-foreground">
                        タイトル
                      </label>
                      <input
                        id="edit-title"
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-summary" className="text-xs font-medium text-muted-foreground">
                        要約
                      </label>
                      <input
                        id="edit-summary"
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        placeholder="ストーリーの一文要約"
                      />
                    </div>
                    {/* 修正プリセットカード */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        ✨ AI修正プリセット（タップでメモ欄に挿入）
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {EDIT_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => {
                              setEditBody((prev) =>
                                `【修正依頼】${preset.prompt}\n\n---\n${prev}`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-warm/50 px-3 py-2 text-xs text-[#2C3E50] transition-all hover:border-primary/40 hover:bg-warm active:scale-95"
                          >
                            <span>{preset.icon}</span>
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="edit-body" className="text-xs font-medium text-muted-foreground">
                        本文
                      </label>
                      <Textarea
                        id="edit-body"
                        className="mt-1 min-h-[200px]"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={saveEdit} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        保存する
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 表示モード */
                  <div className="flex flex-col sm:flex-row">
                    {/* サムネイル */}
                    <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-warm to-secondary sm:h-auto sm:w-40">
                      <BookOpen className="h-8 w-8 text-primary/40" />
                    </div>

                    {/* コンテンツ */}
                    <div className="flex-1 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            story.status === "published"
                              ? "default"
                              : "secondary"
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
                        {story.emotion_tags &&
                          (story.emotion_tags as string[]).slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                      </div>

                      <h3 className="mt-2 font-semibold leading-snug">
                        {story.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {story.summary || story.body.slice(0, 100)}
                      </p>

                      {/* 名言 */}
                      {story.key_quotes &&
                        (story.key_quotes as string[]).length > 0 && (
                          <blockquote className="mt-2 border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">
                            {(story.key_quotes as string[])[0]}
                          </blockquote>
                        )}

                      <Separator className="my-3" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {story.published_at && (
                            <span>
                              {new Date(story.published_at).toLocaleDateString(
                                "ja-JP"
                              )}{" "}
                              公開
                            </span>
                          )}
                          {!story.published_at && (
                            <span>
                              {new Date(story.created_at).toLocaleDateString(
                                "ja-JP"
                              )}{" "}
                              作成
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() =>
                              handleStatusToggle(story)
                            }
                          >
                            {story.status === "published" ? (
                              <>
                                <FileText className="h-3 w-3" />
                                下書きに戻す
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                公開する
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => startEdit(story)}
                          >
                            <Edit2 className="h-3 w-3" />
                            編集
                          </Button>
                        </div>
                      </div>

                      {/* SNSシェアセクション */}
                      {story.status === "published" && (
                        <div className="mt-3 border-t pt-3">
                          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Share2 className="h-3 w-3" />
                            SNSでシェア
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => {
                                const digest = `${story.title}\n\n${story.summary ?? story.body.slice(0, 100)}...\n\n#オシドリ #飲食店の想い`;
                                navigator.clipboard.writeText(digest);
                                setCopiedId(story.id + "_ig");
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                            >
                              {copiedId === story.id + "_ig" ? <Check className="h-3 w-3 text-green-600" /> : <Instagram className="h-3 w-3" />}
                              Instagram用コピー
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => {
                                const digest = `${story.title}\n\n${story.summary ?? story.body.slice(0, 80)}...\n\nhttps://oshidori.vercel.app/stories\n#オシドリ`;
                                navigator.clipboard.writeText(digest);
                                setCopiedId(story.id + "_x");
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                            >
                              {copiedId === story.id + "_x" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              X(Twitter)用コピー
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => {
                                const digest = `【${story.title}】\n${story.summary ?? story.body.slice(0, 120)}...\n\nオシドリで詳しく読む: https://oshidori.vercel.app`;
                                navigator.clipboard.writeText(digest);
                                setCopiedId(story.id + "_gbp");
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                            >
                              {copiedId === story.id + "_gbp" ? <Check className="h-3 w-3 text-green-600" /> : <Globe className="h-3 w-3" />}
                              GBP用コピー
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
