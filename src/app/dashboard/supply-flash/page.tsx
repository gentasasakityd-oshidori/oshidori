"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, Send, Trash2, Image as ImageIcon, Clock, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type SupplyFlashPost = {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  supply_type: string;
  remaining_count: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

const SUPPLY_TYPES = [
  { value: "limited", label: "限定", emoji: "🔥" },
  { value: "seasonal", label: "季節", emoji: "🌸" },
  { value: "special", label: "特別", emoji: "✨" },
  { value: "restock", label: "再入荷", emoji: "📦" },
] as const;

export default function SupplyFlashPage() {
  const [posts, setPosts] = useState<SupplyFlashPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // フォーム
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [supplyType, setSupplyType] = useState("limited");
  const [remainingCount, setRemainingCount] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/supply-flash");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("画像は5MB以下にしてください");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject", "supply_flash");

      const res = await fetch("/api/dashboard/photos", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      } else {
        toast.error("画像のアップロードに失敗しました");
      }
    } catch {
      toast.error("画像のアップロードに失敗しました");
    }
    setUploading(false);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const hours = Number(expiresHours) || 24;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const res = await fetch("/api/dashboard/supply-flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          supply_type: supplyType,
          remaining_count: remainingCount ? Number(remainingCount) : null,
          expires_at: expiresAt,
        }),
      });

      if (res.ok) {
        toast.success("在庫速報を投稿しました");
        setTitle("");
        setDescription("");
        setImageUrl(null);
        setRemainingCount("");
        setExpiresHours("24");
        setSupplyType("limited");
        fetchPosts();
      } else {
        const err = await res.json();
        toast.error(err.error || "投稿に失敗しました");
      }
    } catch {
      toast.error("投稿に失敗しました");
    }
    setSubmitting(false);
  }

  async function handleDelete(postId: string) {
    if (!confirm("この投稿を削除しますか？")) return;
    try {
      const res = await fetch(`/api/dashboard/supply-flash?id=${postId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("削除しました");
        fetchPosts();
      }
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  function isExpired(post: SupplyFlashPost): boolean {
    if (!post.expires_at) return false;
    return new Date(post.expires_at) < new Date();
  }

  function formatExpiresAt(dateStr: string | null): string {
    if (!dateStr) return "期限なし";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();

    if (diffMs < 0) return "期限切れ";
    if (diffMs < 60 * 60 * 1000) return `あと${Math.ceil(diffMs / (60 * 1000))}分`;
    if (diffMs < 24 * 60 * 60 * 1000) return `あと${Math.ceil(diffMs / (60 * 60 * 1000))}時間`;
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ヘッダー */}
      <div>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-bold text-[#2C3E50]">在庫速報</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          限定メニューや日替わり情報をお客さんに即座にお知らせ
        </p>
      </div>

      {/* 投稿フォーム */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handlePost} className="space-y-3">
            {/* タイトル */}
            <div>
              <Input
                placeholder="タイトル（例: 本日限定！自家製ティラミス）"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
              />
              <p className="mt-1 text-right text-xs text-gray-400">{title.length}/60</p>
            </div>

            {/* 説明 */}
            <div>
              <Textarea
                placeholder="詳細（任意）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
                rows={2}
              />
              <p className="mt-1 text-right text-xs text-gray-400">{description.length}/280</p>
            </div>

            {/* 画像 */}
            <div className="flex items-center gap-2">
              {imageUrl ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
                  <img src={imageUrl} alt="プレビュー" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  写真を追加
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* 種別 + 残数 + 期限 */}
            <div className="flex flex-wrap gap-2">
              {/* 種別 */}
              <div className="flex gap-1">
                {SUPPLY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSupplyType(t.value)}
                    className={`rounded-full px-2.5 py-1 text-xs transition-all ${
                      supplyType === t.value
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {/* 残数 */}
              <div className="flex-1">
                <label className="text-xs text-gray-500">残数（任意）</label>
                <Input
                  type="number"
                  placeholder="例: 10"
                  value={remainingCount}
                  onChange={(e) => setRemainingCount(e.target.value)}
                  min={0}
                  className="mt-0.5"
                />
              </div>
              {/* 期限 */}
              <div className="flex-1">
                <label className="text-xs text-gray-500">掲載期限</label>
                <select
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                  className="mt-0.5 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="3">3時間</option>
                  <option value="6">6時間</option>
                  <option value="12">12時間</option>
                  <option value="24">24時間</option>
                  <option value="48">2日間</option>
                  <option value="72">3日間</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !title.trim()}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              投稿する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 投稿一覧 */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-[#2C3E50]">投稿一覧</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            まだ在庫速報はありません
          </p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => {
              const expired = isExpired(post);
              const typeInfo = SUPPLY_TYPES.find((t) => t.value === post.supply_type);
              return (
                <Card
                  key={post.id}
                  className={expired ? "opacity-50" : ""}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{typeInfo?.emoji}</span>
                          <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                            expired
                              ? "bg-gray-100 text-gray-400"
                              : "bg-amber-50 text-amber-600"
                          }`}>
                            {typeInfo?.label}
                          </span>
                          {post.remaining_count != null && (
                            <span className="text-xs text-gray-400">
                              残り{post.remaining_count}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[#2C3E50]">{post.title}</p>
                        {post.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{post.description}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatExpiresAt(post.expires_at)}</span>
                          <span>·</span>
                          <span>
                            {new Date(post.created_at).toLocaleDateString("ja-JP", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {post.image_url && (
                          <div className="h-12 w-12 overflow-hidden rounded-lg">
                            <img
                              src={post.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
