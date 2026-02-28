"use client";

import { useState } from "react";
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Globe,
  Camera,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function ShopInfoPage() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">店舗情報</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            お店の基本情報を編集できます
          </p>
        </div>
        <Button className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          {saved ? "保存しました！" : "保存する"}
        </Button>
      </div>

      {/* カバー画像 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Camera className="h-4 w-4 text-primary" />
            カバー画像
          </h2>
          <div className="mt-4 flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-border bg-warm-light">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                クリックまたはドラッグで画像をアップロード
              </p>
              <p className="text-xs text-muted-foreground">
                推奨サイズ: 1200 x 400px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardContent className="space-y-5 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Store className="h-4 w-4 text-primary" />
            基本情報
          </h2>

          <div className="space-y-2">
            <label htmlFor="shop-name" className="text-sm font-medium">
              店舗名 <span className="text-destructive">*</span>
            </label>
            <Input
              id="shop-name"
              defaultValue="蔵前 手打ちそば やまと"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="owner-name" className="text-sm font-medium">
              オーナー名
            </label>
            <Input id="owner-name" defaultValue="山田太郎" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                カテゴリー
              </label>
              <Input id="category" defaultValue="そば・うどん" />
            </div>
            <div className="space-y-2">
              <label htmlFor="area" className="text-sm font-medium">
                エリア
              </label>
              <Input id="area" defaultValue="蔵前・浅草橋" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="catch-copy" className="text-sm font-medium">
              キャッチコピー
            </label>
            <Input
              id="catch-copy"
              defaultValue="三代続く石臼挽き手打ちそば"
              placeholder="お店を一言で表すフレーズ"
            />
          </div>
        </CardContent>
      </Card>

      {/* アクセス情報 */}
      <Card>
        <CardContent className="space-y-5 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            アクセス情報
          </h2>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">
              住所 <span className="text-destructive">*</span>
            </label>
            <Input
              id="address"
              defaultValue="東京都台東区蔵前3-14-7"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="access" className="text-sm font-medium">
              アクセス
            </label>
            <Input
              id="access"
              defaultValue="都営浅草線 蔵前駅 徒歩3分"
              placeholder="最寄り駅からのアクセスなど"
            />
          </div>
        </CardContent>
      </Card>

      {/* 営業情報 */}
      <Card>
        <CardContent className="space-y-5 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            営業情報
          </h2>

          <div className="space-y-2">
            <label htmlFor="hours" className="text-sm font-medium">
              営業時間
            </label>
            <Input
              id="hours"
              defaultValue="11:00〜14:30 / 17:00〜21:00"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="closed" className="text-sm font-medium">
              定休日
            </label>
            <Input id="closed" defaultValue="月曜日" />
          </div>
        </CardContent>
      </Card>

      {/* 連絡先 */}
      <Card>
        <CardContent className="space-y-5 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Phone className="h-4 w-4 text-primary" />
            連絡先
          </h2>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              電話番号
            </label>
            <Input id="phone" defaultValue="03-XXXX-XXXX" />
          </div>

          <div className="space-y-2">
            <label htmlFor="website" className="text-sm font-medium">
              ウェブサイト
            </label>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                id="website"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 公開ステータス */}
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <h2 className="font-semibold">公開ステータス</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              お店のページが一般公開されています
            </p>
          </div>
          <Badge variant="default">公開中</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
