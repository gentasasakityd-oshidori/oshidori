"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, MailOpen, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VISIT_MOOD_TAGS, EMOTION_TAGS } from "@/lib/constants";
import type { FanLetterWithUser } from "@/types/database";

export default function DashboardFanLettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<FanLetterWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    async function loadShopId() {
      try {
        const res = await fetch("/api/dashboard/shop");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.shop) {
            setShopId(data.shop.id);
          }
        }
      } catch {
        // ignore
      }
    }
    loadShopId();
  }, [router]);

  useEffect(() => {
    if (!shopId) return;
    async function loadLetters() {
      setLoading(true);
      try {
        const res = await fetch(`/api/fan-letters?shop_id=${shopId}`);
        if (res.ok) {
          const data = await res.json();
          setLetters(data.letters ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadLetters();
  }, [shopId]);

  async function markAsRead(letterId: string) {
    try {
      const res = await fetch(`/api/fan-letters/${letterId}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setLetters((prev) =>
          prev.map((l) =>
            l.id === letterId ? { ...l, read_at: new Date().toISOString() } : l
          )
        );
      }
    } catch {
      // ignore
    }
  }

  const moodTagMap = Object.fromEntries(VISIT_MOOD_TAGS.map((t) => [t.id, t]));
  const emotionTagMap = Object.fromEntries(EMOTION_TAGS.map((t) => [t.id, t]));
  const filtered = filter === "unread" ? letters.filter((l) => !l.read_at) : letters;
  const unreadCount = letters.filter((l) => !l.read_at).length;

  // 感情タグ統計
  const emotionStats = EMOTION_TAGS.map((tag) => {
    const count = letters.filter(
      (l) => Array.isArray(l.emotion_tags) && l.emotion_tags.includes(tag.id)
    ).length;
    return { ...tag, count };
  })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  // 今月のレター数
  const thisMonth = new Date();
  const thisMonthCount = letters.filter((l) => {
    const d = new Date(l.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-skeleton rounded" />
        <div className="h-24 w-full animate-skeleton rounded-xl" />
        <div className="h-24 w-full animate-skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#2C3E50] flex items-center gap-2">
            💌 ファンレター
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#E06A4E] px-2 py-0.5 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            お客さまからの推しメッセージ
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            すべて ({letters.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => setFilter("unread")}
            className="text-xs gap-1"
          >
            <Filter className="h-3 w-3" />
            未読 ({unreadCount})
          </Button>
        </div>
      </div>

      {/* 統計サマリー */}
      {letters.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-[11px] text-muted-foreground">今月のレター</p>
            <p className="text-2xl font-bold text-[#2C3E50] mt-1">{thisMonthCount}<span className="text-sm font-normal text-muted-foreground ml-1">通</span></p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-[11px] text-muted-foreground">累計</p>
            <p className="text-2xl font-bold text-[#2C3E50] mt-1">{letters.length}<span className="text-sm font-normal text-muted-foreground ml-1">通</span></p>
          </div>
          {emotionStats.length > 0 && (
            <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-[11px] text-muted-foreground mb-2">よく選ばれる感情タグ TOP3</p>
              <div className="flex flex-wrap gap-2">
                {emotionStats.slice(0, 3).map((stat) => (
                  <span key={stat.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                    {stat.emoji} {stat.label} ({stat.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* レター一覧 */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
          <Mail className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "unread" ? "未読のレターはありません" : "まだファンレターが届いていません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((letter) => {
            const mood = letter.mood_tag ? moodTagMap[letter.mood_tag] : null;
            const isUnread = !letter.read_at;

            return (
              <div
                key={letter.id}
                className={`rounded-xl border p-4 transition-all ${
                  isUnread
                    ? "border-[#E06A4E]/20 bg-orange-50/30 shadow-sm"
                    : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {/* アバター */}
                    {letter.user_avatar_url ? (
                      <img
                        src={letter.user_avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">
                        {letter.is_anonymous ? "🙈" : (letter.user_nickname?.[0] ?? "?")}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-[#2C3E50]">
                        {letter.is_anonymous ? "匿名さん" : (letter.user_nickname ?? "ユーザー")}
                      </span>
                      {mood && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                          {mood.emoji} {mood.label}
                        </span>
                      )}
                    </div>
                    {Array.isArray(letter.emotion_tags) && letter.emotion_tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {letter.emotion_tags.map((tagId: string) => {
                          const emotion = emotionTagMap[tagId];
                          if (!emotion) return null;
                          return (
                            <span key={tagId} className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                              {emotion.emoji} {emotion.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">
                      {new Date(letter.created_at).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-[#E06A4E]" />
                    )}
                  </div>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-[#2C3E50]/90">
                  {letter.content}
                </p>

                {isUnread && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => markAsRead(letter.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <MailOpen className="h-3.5 w-3.5" />
                      既読にする
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
