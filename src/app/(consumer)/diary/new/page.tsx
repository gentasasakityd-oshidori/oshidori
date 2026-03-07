"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Camera, ChevronLeft, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VISIT_MOOD_TAGS, EMOTION_TAGS } from "@/lib/constants";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

interface OshiShop {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  shop_image_url: string | null;
}

export default function NewDiaryEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedShopId = searchParams.get("shopId");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // フォームstate
  const [step, setStep] = useState(1); // 1: 写真, 2: 店舗, 3: ムード, 4: メモ
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedShop, setSelectedShop] = useState<OshiShop | null>(null);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oshiShops, setOshiShops] = useState<OshiShop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  // 推し店リスト取得
  useEffect(() => {
    async function loadOshiShops() {
      try {
        const res = await fetch("/api/oshi/my");
        if (res.status === 401) {
          router.push("/login?next=/diary/new");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          const shops = (data.shops ?? []).map((s: Record<string, unknown>) => ({
            id: s.id,
            shop_id: s.shop_id ?? s.id,
            shop_name: (s as Record<string, unknown>).shop_name ?? (s as Record<string, unknown>).name ?? "不明",
            shop_slug: (s as Record<string, unknown>).shop_slug ?? (s as Record<string, unknown>).slug ?? "",
            shop_image_url: (s as Record<string, unknown>).shop_image_url ?? (s as Record<string, unknown>).image_url ?? null,
          }));
          setOshiShops(shops);

          // URLパラメータで店舗指定がある場合、自動選択
          if (preSelectedShopId) {
            const match = shops.find(
              (s: OshiShop) => s.shop_id === preSelectedShopId || s.id === preSelectedShopId,
            );
            if (match) {
              setSelectedShop(match);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingShops(false);
      }
    }
    loadOshiShops();
  }, [router, preSelectedShopId]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    // 店舗が事前選択済みならステップ2をスキップ
    setStep(selectedShop ? 3 : 2);
  }

  async function handleSubmit() {
    if (!selectedShop || submitting) return;
    setSubmitting(true);

    try {
      let photoUrl: string | null = null;

      // 写真をSupabase Storageにアップロード
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);

        const uploadRes = await fetch("/api/visits/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          photoUrl = uploadData.url;
        } else {
          const err = await uploadRes.json();
          toast.error(err.error ?? "写真のアップロードに失敗しました");
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: selectedShop.shop_id,
          mood_tags: selectedMoods.length > 0 ? selectedMoods : undefined,
          emotion_tags: selectedEmotions.length > 0 ? selectedEmotions : undefined,
          memo: memo.trim() || null,
          photo_url: photoUrl,
          is_public: isPublic,
        }),
      });

      if (res.ok) {
        toast.success("来店記録を保存しました！");
        router.push("/diary");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "保存に失敗しました");
      }
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-[#2C3E50]">来店記録をつける</h1>
      </div>

      {/* ステッププログレス */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-[#E06A4E]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: 写真 */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[#2C3E50]">📸 写真を撮る</h2>
          <p className="text-sm text-muted-foreground">
            お料理やお店の雰囲気を写真で残しましょう（任意）
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E06A4E]/30 bg-[#E06A4E]/5 p-8 text-[#E06A4E] transition-colors hover:border-[#E06A4E]/50 hover:bg-[#E06A4E]/10"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-medium">撮影する</span>
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                  fileInputRef.current.setAttribute("capture", "environment");
                }
              }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100"
            >
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">ライブラリから</span>
            </button>
          </div>

          <button
            onClick={() => setStep(selectedShop ? 3 : 2)}
            className="text-sm text-muted-foreground hover:text-gray-600 transition-colors"
          >
            写真なしで続ける →
          </button>
        </div>
      )}

      {/* Step 2: 店舗選択 */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[#2C3E50]">🏪 お店を選ぶ</h2>
          <p className="text-sm text-muted-foreground">
            推し店リストからお店を選んでください
          </p>

          {photoPreview && (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
              <Image src={photoPreview} alt="撮影した写真" fill className="object-cover" sizes="100vw" />
            </div>
          )}

          {loadingShops ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 w-full animate-skeleton rounded-lg" />
              ))}
            </div>
          ) : oshiShops.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                推し店がまだありません。まずはお店を推しに追加しましょう。
              </p>
              <Button size="sm" className="mt-2" asChild>
                <a href="/explore">お店を探す</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {oshiShops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => {
                    setSelectedShop(shop);
                    setStep(3);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 transition-all ${
                    selectedShop?.id === shop.id
                      ? "border-[#E06A4E] bg-[#E06A4E]/5"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {shop.shop_image_url ? (
                    <Image
                      src={shop.shop_image_url}
                      alt={shop.shop_name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                      🍽
                    </div>
                  )}
                  <span className="text-sm font-medium text-[#2C3E50]">{shop.shop_name}</span>
                  {selectedShop?.id === shop.id && (
                    <Check className="ml-auto h-4 w-4 text-[#E06A4E]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: ムードタグ（複数選択） */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[#2C3E50]">
            {selectedShop?.shop_name}での気分は？
          </h2>
          <p className="text-sm text-muted-foreground">
            当てはまる気持ちをいくつでも選んでください
          </p>

          <div className="grid grid-cols-3 gap-2">
            {VISIT_MOOD_TAGS.map((tag) => {
              const isSelected = selectedMoods.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    setSelectedMoods((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id]
                    );
                  }}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-[#E06A4E] bg-[#E06A4E]/5 shadow-sm"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E06A4E] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                  <span className="text-2xl">{tag.emoji}</span>
                  <span className="text-[11px] text-gray-600">{tag.label}</span>
                </button>
              );
            })}
          </div>

          {selectedMoods.length > 0 && (
            <p className="text-xs text-[#E06A4E] font-medium">
              {selectedMoods.length}個選択中
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              className="flex-1 gap-2 bg-[#E06A4E] hover:bg-[#d0593d]"
              onClick={() => setStep(4)}
            >
              次へ
            </Button>
            {selectedMoods.length === 0 && (
              <button
                onClick={() => setStep(4)}
                className="text-sm text-muted-foreground hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                スキップ →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: メモ + 送信 */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[#2C3E50]">📝 ひとこと（任意）</h2>

          {/* プレビューカード */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="text-sm">
              <span className="font-medium text-[#2C3E50]">{selectedShop?.shop_name}</span>
              {selectedMoods.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedMoods.map((moodId) => {
                    const tag = VISIT_MOOD_TAGS.find((t) => t.id === moodId);
                    return tag ? (
                      <span key={moodId} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] text-[#E06A4E]">
                        {tag.emoji} {tag.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 感情タグ（任意） */}
          <div>
            <p className="text-sm font-medium text-[#2C3E50] mb-2">
              どんな体験でしたか？ <span className="text-xs text-muted-foreground font-normal">(任意)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {EMOTION_TAGS.map((tag) => {
                const isSelected = selectedEmotions.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedEmotions((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id]
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            placeholder="今日の感想やメモをどうぞ..."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={500}
            className="h-24 resize-none"
          />
          <p className="text-right text-[10px] text-gray-400">{memo.length}/500</p>

          {/* 公開設定 */}
          <label className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#E06A4E] focus:ring-[#E06A4E]"
            />
            <div>
              <span className="text-sm font-medium text-[#2C3E50]">記録を公開する</span>
              <p className="text-[10px] text-gray-400">お店ページの「ファンの声」に表示されます</p>
            </div>
          </label>

          <Button
            className="w-full gap-2 bg-[#E06A4E] hover:bg-[#d0593d]"
            onClick={handleSubmit}
            disabled={submitting || !selectedShop}
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            記録を保存する
          </Button>
        </div>
      )}

      {/* 戻るボタン（Step 2以降） */}
      {step > 1 && (
        <button
          onClick={() => setStep((s) => s - 1)}
          className="mt-4 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          前のステップに戻る
        </button>
      )}
    </div>
  );
}
