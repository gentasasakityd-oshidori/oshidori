"use client";

import { useRef, useCallback } from "react";
import { Download, Printer, QrCode, ExternalLink } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ダミーの店舗URL
const SHOP_URL = "https://oshidori.jp/shops/kuramae-yamato";
const SHOP_NAME = "蔵前 手打ちそば やまと";

export default function QRCodePage() {
  const qrRef = useRef<QRCode>(null);

  const handleDownload = useCallback(() => {
    if (qrRef.current) {
      (qrRef.current as unknown as { download: (type: string, name: string) => void }).download(
        "png",
        "oshidori-qrcode"
      );
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold">QRコード</h1>
        <p className="mt-1 text-sm text-muted-foreground">{SHOP_NAME}</p>
      </div>

      {/* QRコード表示 */}
      <Card>
        <CardContent className="flex flex-col items-center p-6">
          <div className="rounded-lg border border-border bg-white p-4">
            <QRCode
              ref={qrRef}
              value={SHOP_URL}
              size={240}
              bgColor="#FFFFFF"
              fgColor="#3D2B1F"
              qrStyle="dots"
              eyeRadius={8}
              quietZone={16}
            />
          </div>
          <p className="mt-4 text-center text-sm font-medium">{SHOP_NAME}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            {SHOP_URL}
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
