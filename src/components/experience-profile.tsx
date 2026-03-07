"use client";

import { useState, useEffect } from "react";
import { VISIT_MOOD_TAGS, EMPATHY_TAGS } from "@/lib/constants";

interface ExperienceProfileProps {
  shopSlug: string;
}

interface ExperienceData {
  shop_id: string;
  visit_count: number;
  mood_tags: Record<string, number>;
  empathy_tags: Record<string, number>;
}

// 来店者が感じた店舗の特徴をタグで表示
export function ExperienceProfile({ shopSlug }: ExperienceProfileProps) {
  const [data, setData] = useState<ExperienceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shops/${shopSlug}/experience`);
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
  }, [shopSlug]);

  if (loading || !data) return null;

  // ムードタグの上位を取得
  const moodTagMap = Object.fromEntries(
    VISIT_MOOD_TAGS.map((t) => [t.id, t])
  );
  const topMoodTags = Object.entries(data.mood_tags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([id, count]) => ({
      ...moodTagMap[id],
      count,
    }))
    .filter((t) => t.label); // 有効なタグのみ

  // 共感タップの上位を取得
  const empathyTagMap = Object.fromEntries(
    EMPATHY_TAGS.map((t) => [t.id, t])
  );
  const topEmpathyTags = Object.entries(data.empathy_tags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, count]) => ({
      ...empathyTagMap[id],
      count,
    }))
    .filter((t) => t.label);

  // データが少なすぎる場合は非表示
  const totalSignals =
    Object.values(data.mood_tags).reduce((s, c) => s + c, 0) +
    Object.values(data.empathy_tags).reduce((s, c) => s + c, 0);
  if (totalSignals < 1) return null;

  return (
    <section className="border-t border-gray-100 px-4 py-5">
      <h2 className="text-sm font-bold text-[#2C3E50] mb-3">
        来店者の声から見えるお店の魅力
      </h2>

      {/* ムードタグ（来店記録由来） */}
      {topMoodTags.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider">
            来店者の気持ち
          </p>
          <div className="flex flex-wrap gap-2">
            {topMoodTags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs text-[#2C3E50]"
              >
                <span>{tag.emoji}</span>
                <span className="font-medium">{tag.label}</span>
                {tag.count > 1 && (
                  <span className="ml-0.5 rounded-full bg-[#E06A4E]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#E06A4E]">
                    {tag.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 共感タグ（共感タップ由来） */}
      {topEmpathyTags.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider">
            共感ポイント
          </p>
          <div className="flex flex-wrap gap-2">
            {topEmpathyTags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs text-[#2C3E50]"
              >
                <span>{tag.emoji}</span>
                <span className="font-medium">{tag.label}</span>
                {tag.count > 1 && (
                  <span className="ml-0.5 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600">
                    {tag.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 来店記録数のサマリー */}
      {data.visit_count > 0 && (
        <p className="mt-3 text-[10px] text-gray-400">
          📔 {data.visit_count}件の来店記録から集計
        </p>
      )}
    </section>
  );
}
