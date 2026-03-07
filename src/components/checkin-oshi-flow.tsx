"use client";

import { useState } from "react";
import { Check, Heart, Camera, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { VISIT_MOOD_TAGS } from "@/lib/constants";

interface CheckinOshiFlowProps {
  shopId: string;
  shopName: string;
  shopSlug: string;
  /** 既に推し登録済みかどうか */
  isAlreadyOshi: boolean;
  onClose: () => void;
  onComplete: (result: { checkedIn: boolean; oshiRegistered: boolean }) => void;
}

type FlowStep = "confirm" | "submitting" | "done";

export function CheckinOshiFlow({
  shopId,
  shopName,
  shopSlug,
  isAlreadyOshi,
  onClose,
  onComplete,
}: CheckinOshiFlowProps) {
  const [step, setStep] = useState<FlowStep>("confirm");
  const [doCheckin, setDoCheckin] = useState(true);
  const [doOshi, setDoOshi] = useState(!isAlreadyOshi);
  const [selectedMoodTags, setSelectedMoodTags] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function toggleMoodTag(tagId: string) {
    setSelectedMoodTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!doCheckin && !doOshi) {
      onClose();
      return;
    }

    setStep("submitting");
    setError(null);

    try {
      let checkedIn = false;
      let oshiRegistered = false;

      // 推し登録（チェックインの前に実行 — visit記録にはoshi状態が必要なため）
      if (doOshi && !isAlreadyOshi) {
        const oshiRes = await fetch("/api/oshi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop_id: shopId }),
        });
        if (oshiRes.ok) {
          const data = await oshiRes.json();
          oshiRegistered = data.is_oshi === true;
        }
      }

      // チェックイン（来店記録）
      if (doCheckin) {
        const moodTagsArray = Array.from(selectedMoodTags);
        const visitRes = await fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop_id: shopId,
            mood_tags: moodTagsArray.length > 0 ? moodTagsArray : undefined,
            memo: "",
            is_public: false,
          }),
        });
        if (visitRes.ok) {
          checkedIn = true;
        }
      }

      setStep("done");
      onComplete({ checkedIn, oshiRegistered });
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
      setStep("confirm");
    }
  }

  if (step === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
        <div className="w-full max-w-md rounded-t-2xl bg-white px-6 pb-8 pt-6 sm:rounded-2xl animate-in slide-in-from-bottom duration-300">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <Check className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-center text-lg font-bold text-[#2C3E50]">
            ようこそ！
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {shopName}へのチェックインが完了しました
          </p>

          <div className="mt-5 space-y-2.5">
            <Button
              className="w-full gap-1.5 bg-[#E06A4E] hover:bg-[#d0593d]"
              asChild
            >
              <Link href={`/diary/new?shopId=${shopId}`}>
                <Camera className="h-4 w-4" />
                体験を記録する
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full gap-1.5"
              asChild
            >
              <Link href={`/shops/${shopSlug}`}>
                <Send className="h-4 w-4" />
                ファンレターを送る
              </Link>
            </Button>
            <button
              onClick={onClose}
              className="w-full py-2 text-center text-sm text-muted-foreground hover:text-gray-600 transition-colors"
            >
              あとで
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white px-6 pb-8 pt-6 sm:rounded-2xl animate-in slide-in-from-bottom duration-300">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#2C3E50]">
            📍 {shopName}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          お店に来たことを記録しましょう
        </p>

        {/* チェックボックスリスト */}
        <div className="space-y-3">
          {/* チェックイン */}
          <label className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              checked={doCheckin}
              onChange={(e) => setDoCheckin(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-[#E06A4E] focus:ring-[#E06A4E]"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-[#2C3E50]">
                チェックイン
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                来店を記録します
              </p>
            </div>
            <Check className="h-4 w-4 text-gray-300" />
          </label>

          {/* 推し登録（未登録時のみ表示） */}
          {!isAlreadyOshi && (
            <label className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                checked={doOshi}
                onChange={(e) => setDoOshi(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#E06A4E] focus:ring-[#E06A4E]"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-[#2C3E50]">
                  推し店に登録
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  マイページに追加されます
                </p>
              </div>
              <Heart className="h-4 w-4 text-gray-300" />
            </label>
          )}
        </div>

        {/* 気分タグ（任意） */}
        {doCheckin && (
          <div className="mt-4">
            <p className="text-sm font-medium text-[#2C3E50] mb-2">
              今日の気分は？ <span className="text-xs text-muted-foreground font-normal">(任意)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {VISIT_MOOD_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleMoodTag(tag.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedMoodTags.has(tag.id)
                      ? "bg-[#E06A4E] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-500">{error}</p>
        )}

        {/* 実行ボタン */}
        <Button
          onClick={handleSubmit}
          disabled={step === "submitting" || (!doCheckin && !doOshi)}
          className="mt-5 w-full gap-1.5 bg-[#E06A4E] hover:bg-[#d0593d]"
        >
          {step === "submitting" ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              処理中...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              完了
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
