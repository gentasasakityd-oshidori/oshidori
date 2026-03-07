"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Printer, QrCode, ExternalLink, Loader2 } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ShopInfo = {
  slug: string;
  name: string;
};

export default function QRCodePage() {
  const qrRef = useRef<QRCode>(null);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/shop");
        if (!res.ok) {
          setError(res.status === 401 ? "ログインが必要です" : "データの読み込みに失敗しました");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.shop) {
          setShop({ slug: data.shop.slug, name: data.shop.name });
        }
      } catch {
        setError("ネットワークエラーが発生しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const shopUrl = shop
    ? `https://oshidori.vercel.app/shops/${shop.slug}`
    : "";

  const handleDownload = useCallback(() => {
    if (qrRef.current) {
      (qrRef.current as unknown as { download: (type: string, name: string) => void }).download(
        "png",
        `oshidori-qrcode-${shop?.slug ?? "shop"}`
      );
    }
  }, [shop]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">QRコード</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            店舗情報を設定するとQRコードが生成されます
          </p>
        </div>
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <QrCode className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 font-medium">店舗情報が見つかりません</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              まず店舗プロフィールを設定してください
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold">QRコード</h1>
        <p className="mt-1 text-sm text-muted-foreground">{shop.name}</p>
      </div>

      {/* QRコード表示 */}
      <Card>
        <CardContent className="flex flex-col items-center p-6">
          <div className="rounded-lg border border-border bg-white p-4">
            <QRCode
              ref={qrRef}
              value={shopUrl}
              size={240}
              bgColor="#FFFFFF"
              fgColor="#3D2B1F"
              qrStyle="dots"
              eyeRadius={8}
              quietZone={16}
            />
          </div>
          <p className="mt-4 text-center text-sm font-medium">{shop.name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            {shopUrl}
          </p>

          <Separator className="my-6 w-full" />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              PNGでダウンロード
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              印刷する
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使い方ガイド */}
      <Card>
        <CardContent className="p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <QrCode className="h-5 w-5 text-primary" />
            QRコードの活用方法
          </h2>
          <div className="mt-4 space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                1
              </div>
              <div>
                <h3 className="font-medium">店内POPとして印刷</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  QRコードをダウンロードして印刷し、テーブルやカウンターに設置してください。
                  お客さまがスマホで読み取ると、あなたのお店のストーリーページが開きます。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </div>
              <div>
                <h3 className="font-medium">メニュー表に掲載</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  メニュー表やショップカードにQRコードを印刷すると、
                  料理を待つ間にお店のこだわりを知ってもらえます。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                3
              </div>
              <div>
                <h3 className="font-medium">SNSでシェア</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  QRコードの画像をSNSに投稿して、オンラインでもお店のストーリーを広めましょう。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 注意書き */}
      <div className="rounded-lg bg-warm p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">ご利用にあたって</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            QRコードは店舗ページのURLに基づいて生成されています
          </li>
          <li>
            印刷時は、十分な大きさ（3cm x 3cm以上推奨）で出力してください
          </li>
          <li>
            QRコードが正しく読み取れるか、設置前に必ず確認してください
          </li>
        </ul>
      </div>
    </div>
  );
}
