"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  CheckCircle2,
  Loader2,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Shot = {
  subject: string;
  description: string;
  priority: string;
};

type PhotoRequest = {
  id: string;
  shop_id: string;
  shots: Shot[];
  status: string;
  created_at: string;
};

export default function PhotosPage() {
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<Map<string, string>>(
    new Map()
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentShotSubject, setCurrentShotSubject] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/photos");
        if (!res.ok) {
          setLoadError(res.status === 401 ? "ログインが必要です" : "データの読み込みに失敗しました");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setRequests(data.requests ?? []);
        setShopId(data.shopId ?? null);
      } catch {
        setLoadError("ネットワークエラーが発生しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  function handleUploadClick(subject: string, index: number) {
    setCurrentShotSubject(subject);
    setUploadingIndex(index);
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;

    // Reset the input
    e.target.value = "";

    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("shop_id", shopId);
    formData.append("shot_subject", currentShotSubject);

    try {
      const res = await fetch("/api/dashboard/photos", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedPhotos((prev) => {
          const next = new Map(prev);
          next.set(currentShotSubject, data.url);
          return next;
        });
      } else {
        const data = await res.json();
        setUploadError(data.error ?? "アップロードに失敗しました");
      }
    } catch {
      setUploadError("アップロードに失敗しました。ストレージの設定を確認してください。");
    }
    setUploadingIndex(null);
  }

  const latestRequest = requests[0];
  const shots = latestRequest?.shots ?? [];
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedShots = [...shots].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2)
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 非表示ファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold">写真撮影リクエスト</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AIインタビューをもとに、撮影してほしい写真のリストです
        </p>
      </div>

      {/* ロードエラー通知 */}
      {loadError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{loadError}</p>
          </CardContent>
        </Card>
      )}

      {/* アップロードエラー通知 */}
      {uploadError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-3">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{uploadError}</p>
          </CardContent>
        </Card>
      )}

      {/* 説明カード */}
      <Card className="border-primary/20 bg-warm">
        <CardContent className="flex items-start gap-3 p-4">
          <Camera className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">まずは1枚だけでOK！</p>
            <p className="mt-1 text-xs text-muted-foreground">
              「必須」マークの写真を1枚だけアップロードすればストーリーを公開できます。
              残りはいつでも追加OK。スマートフォンのカメラで十分きれいに撮れます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 撮影リスト */}
      {sortedShots.length > 0 ? (
        <div className="space-y-3">
          {sortedShots.map((shot, i) => {
            const isUploaded = uploadedPhotos.has(shot.subject);
            const isUploading = uploadingIndex === i;

            return (
              <Card
                key={i}
                className={isUploaded ? "border-green-200 bg-green-50/30" : ""}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* 状態アイコン */}
                  <div className="mt-1 shrink-0">
                    {isUploaded ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{shot.subject}</h3>
                      <Badge
                        variant={
                          shot.priority === "high" && i === 0
                            ? "default"
                            : shot.priority === "high"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {shot.priority === "high" && i === 0
                          ? "必須"
                          : shot.priority === "high"
                            ? "あると◎"
                            : shot.priority === "medium"
                              ? "あると◎"
                              : "任意"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shot.description}
                    </p>
                  </div>

                  {/* アップロードボタン */}
                  <Button
                    variant={isUploaded ? "outline" : "default"}
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => handleUploadClick(shot.subject, i)}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {isUploaded ? "再撮影" : "撮影する"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 font-medium">
              撮影リクエストはまだありません
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              AIインタビューを完了すると、撮影してほしい写真のリストが自動で生成されます
            </p>
          </CardContent>
        </Card>
      )}

      {/* 進捗 */}
      {sortedShots.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">撮影進捗</span>
              <span className="font-medium">
                {uploadedPhotos.size} / {sortedShots.length} 完了
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${(uploadedPhotos.size / sortedShots.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
