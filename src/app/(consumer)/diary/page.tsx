"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Camera, Calendar, ChevronRight, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VISIT_MOOD_TAGS, EMOTION_TAGS } from "@/lib/constants";
import type { VisitRecordWithShop } from "@/types/database";
import { FanLetterModal } from "./fan-letter-modal";

export default function DiaryPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitRecordWithShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [fanLetterTarget, setFanLetterTarget] = useState<VisitRecordWithShop | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/visits");
        if (res.status === 401) {
          router.push("/login?next=/diary");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setVisits(data.visits ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const moodTagMap = Object.fromEntries(VISIT_MOOD_TAGS.map((t) => [t.id, t]));
  const emotionTagMap = Object.fromEntries(EMOTION_TAGS.map((t) => [t.id, t]));

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-skeleton rounded" />
          <div className="h-32 w-full animate-skeleton rounded-xl" />
          <div className="h-32 w-full animate-skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#2C3E50]">📔 推し活ダイアリー</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            推し店での体験を記録しよう
          </p>
        </div>
        <Button size="sm" className="gap-1.5 bg-[#E06A4E] hover:bg-[#d0593d]" asChild>
          <Link href="/diary/new">
            <Plus className="h-3.5 w-3.5" />
            記録する
          </Link>
        </Button>
      </div>

      {/* 空状態 */}
      {visits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#E06A4E]/10">
            <Camera className="h-6 w-6 text-[#E06A4E]" />
          </div>
          <h3 className="text-base font-bold text-[#2C3E50]">まだ記録がありません</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            推しのお店に行ったら、写真やひとことを記録してみましょう
          </p>
          <Button className="mt-4 gap-1.5 bg-[#E06A4E] hover:bg-[#d0593d]" asChild>
            <Link href="/diary/new">
              <Camera className="h-4 w-4" />
              はじめての記録をつける
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => {
            // 複数選択(mood_tags)を優先、後方互換でmood_tagも対応
            const moodIds: string[] = Array.isArray(visit.mood_tags) && visit.mood_tags.length > 0
              ? visit.mood_tags
              : visit.mood_tag ? [visit.mood_tag] : [];
            const moods = moodIds.map((id) => moodTagMap[id]).filter(Boolean);
            const emotionIds: string[] = Array.isArray(visit.emotion_tags) ? visit.emotion_tags : [];
            const emotions = emotionIds.map((id) => emotionTagMap[id]).filter(Boolean);
            return (
              <div
                key={visit.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex gap-3">
                  {/* 写真サムネ */}
                  {visit.photo_url ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={visit.photo_url}
                        alt="来店写真"
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Camera className="h-6 w-6 text-gray-300" />
                    </div>
                  )}

                  {/* コンテンツ */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/shops/${visit.shop_slug}`}
                      className="text-sm font-bold text-[#2C3E50] hover:text-[#E06A4E] transition-colors"
                    >
                      {visit.shop_name}
                      <ChevronRight className="inline h-3 w-3 ml-0.5" />
                    </Link>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(visit.visited_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>

                    {moods.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {moods.map((mood) => (
                          <span key={mood.id} className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] text-[#E06A4E]">
                            {mood.emoji} {mood.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {emotions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {emotions.map((emotion) => (
                          <span key={emotion.id} className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600">
                            {emotion.emoji} {emotion.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {visit.memo && (
                      <p className="mt-1.5 text-xs text-gray-600 line-clamp-2">{visit.memo}</p>
                    )}
                  </div>
                </div>

                {/* アクション */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
                  <span className="text-[10px] text-gray-400">
                    {visit.is_public ? "🌐 公開" : "🔒 非公開"}
                  </span>
                  <button
                    onClick={() => setFanLetterTarget(visit)}
                    className="flex items-center gap-1 text-xs text-[#E06A4E] hover:text-[#d0593d] transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    ファンレターを送る
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ファンレターモーダル */}
      {fanLetterTarget && (
        <FanLetterModal
          visit={fanLetterTarget}
          onClose={() => setFanLetterTarget(null)}
          onSent={() => {
            setFanLetterTarget(null);
          }}
        />
      )}
    </div>
  );
}
