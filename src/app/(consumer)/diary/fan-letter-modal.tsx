"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VISIT_MOOD_TAGS } from "@/lib/constants";
import { toast } from "sonner";
import type { VisitRecordWithShop } from "@/types/database";

interface FanLetterModalProps {
  visit: VisitRecordWithShop;
  onClose: () => void;
  onSent: () => void;
}

export function FanLetterModal({ visit, onClose, onSent }: FanLetterModalProps) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 複数選択(mood_tags)を優先、後方互換でmood_tagも対応
  const moodIds: string[] = Array.isArray(visit.mood_tags) && visit.mood_tags.length > 0
    ? visit.mood_tags
    : visit.mood_tag ? [visit.mood_tag] : [];
  const moods = moodIds.map((id) => VISIT_MOOD_TAGS.find((t) => t.id === id)).filter(Boolean);

  async function handleSend() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/fan-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: visit.shop_id,
          visit_record_id: visit.id,
          content: content.trim(),
          is_anonymous: isAnonymous,
        }),
      });

      if (res.ok) {
        toast.success("ファンレターをお店に届けました！", {
          description: `${visit.shop_name}の店主に届きます`,
        });
        onSent();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "送信に失敗しました");
      }
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* モーダル */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-base font-bold text-[#2C3E50]">💌 ファンレターを送る</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {visit.shop_name}の店主に、あなたの想いを届けましょう
        </p>

        {/* ムードタグ引き継ぎ（複数対応） */}
        {moods.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {moods.map((mood) => mood && (
              <span key={mood.id} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs text-[#E06A4E]">
                {mood.emoji} {mood.label}
              </span>
            ))}
          </div>
        )}

        {/* メッセージ入力 */}
        <Textarea
          placeholder="「いつも美味しいお料理をありがとうございます」「職人の技に感動しました」..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={200}
          className="mt-3 h-28 resize-none"
        />
        <div className="mt-1 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-[#E06A4E] focus:ring-[#E06A4E]"
            />
            <span className="text-[11px] text-gray-500">匿名で送る</span>
          </label>
          <span className="text-[10px] text-gray-400">{content.length}/200</span>
        </div>

        {/* 送信ボタン */}
        <Button
          className="mt-4 w-full gap-2 bg-[#E06A4E] hover:bg-[#d0593d]"
          onClick={handleSend}
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          ファンレターを送る
        </Button>
      </div>
    </div>
  );
}
