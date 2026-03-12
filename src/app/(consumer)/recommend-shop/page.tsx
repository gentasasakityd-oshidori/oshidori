"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, CheckCircle2, Loader2, MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecommendShopPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shopName: "",
    area: "",
    reason: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.shopName.trim()) {
      setError("お店の名前を入力してください");
      return;
    }
    if (!formData.area.trim()) {
      setError("エリアを入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/shop-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: formData.shopName,
          area: formData.area,
          reason: formData.reason || null,
        }),
      });

      if (!res.ok) {
        throw new Error("送信に失敗しました");
      }

      setIsSubmitted(true);
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">リクエストを受け付けました！</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          教えていただいたお店について調べてみます。
          <br />
          掲載が決まったらお知らせします。
        </p>
        <div className="mt-8 flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/home">ホームに戻る</Link>
          </Button>
          <Button onClick={() => { setIsSubmitted(false); setFormData({ shopName: "", area: "", reason: "" }); }}>
            もう1件紹介する
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        href="/home"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        ホームに戻る
      </Link>

      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">お気に入りのお店を教えてください</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          「このお店もオシドリに載ってほしい！」と思うお店を教えてください。
          <br />
          オシドリチームがお店に連絡し、掲載をご提案します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-primary" />
            お店の情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div>
              <Label htmlFor="shopName">お店の名前 *</Label>
              <Input
                id="shopName"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                placeholder="例: 和食処 さくら"
              />
            </div>

            <div>
              <Label htmlFor="area" className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                エリア *
              </Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="例: 目黒区、渋谷駅近く、下北沢"
              />
            </div>

            <div>
              <Label htmlFor="reason">おすすめの理由（任意）</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="例: ご主人のこだわりがすごくて、常連になりたくなるお店です"
                rows={3}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                あなたの推しポイントを教えてください
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  このお店を推薦する
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              ※ ログインなしでも送信できます
            </p>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium mb-2">💡 掲載の流れ</p>
        <ol className="text-xs text-muted-foreground space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
            あなたがお店を推薦
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
            オシドリチームがお店に連絡・ご説明
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
            お店の了承後、インタビュー・ストーリー作成
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">4</span>
            オシドリに掲載！あなたの推し店になります
          </li>
        </ol>
      </div>
    </div>
  );
}
