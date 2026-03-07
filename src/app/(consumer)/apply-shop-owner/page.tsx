"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { AREAS, CATEGORIES } from "@/lib/constants";

export default function ApplyShopOwnerPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    shopName: "",
    shopGenre: "",
    shopArea: "",
    applicantName: "",
    applicantRole: "",
    message: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/shop-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: formData.shopName,
          shop_genre: formData.shopGenre,
          shop_area: formData.shopArea,
          applicant_name: formData.applicantName,
          applicant_role: formData.applicantRole,
          message: formData.message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "申請に失敗しました");
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoggedIn === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Store className="h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">ログインが必要です</h1>
        <p className="mt-2 text-muted-foreground">
          店舗権限の申請にはログインが必要です。
        </p>
        <Button className="mt-6" asChild>
          <Link href="/login?next=/apply-shop-owner">ログインする</Link>
        </Button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">申請を受け付けました</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          審査結果はメールでお知らせします。
          通常1-2営業日以内にご連絡いたします。
        </p>
        <Button className="mt-8" asChild>
          <Link href="/home">ホームに戻る</Link>
        </Button>
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>店舗権限の申請</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                飲食店オーナー・店長の方向け
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="shopName">店名 *</Label>
              <Input
                id="shopName"
                required
                value={formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopName: e.target.value })
                }
                placeholder="例: 和食処 さくら"
              />
            </div>

            <div>
              <Label htmlFor="shopGenre">ジャンル</Label>
              <Select
                value={formData.shopGenre}
                onValueChange={(v) =>
                  setFormData({ ...formData, shopGenre: v })
                }
              >
                <SelectTrigger id="shopGenre">
                  <SelectValue placeholder="ジャンルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="shopArea">エリア</Label>
              <Select
                value={formData.shopArea}
                onValueChange={(v) =>
                  setFormData({ ...formData, shopArea: v })
                }
              >
                <SelectTrigger id="shopArea">
                  <SelectValue placeholder="エリアを選択" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="applicantName">お名前 *</Label>
              <Input
                id="applicantName"
                required
                value={formData.applicantName}
                onChange={(e) =>
                  setFormData({ ...formData, applicantName: e.target.value })
                }
                placeholder="例: 山田太郎"
              />
            </div>

            <div>
              <Label htmlFor="applicantRole">店舗での役割</Label>
              <Select
                value={formData.applicantRole}
                onValueChange={(v) =>
                  setFormData({ ...formData, applicantRole: v })
                }
              >
                <SelectTrigger id="applicantRole">
                  <SelectValue placeholder="役割を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">オーナー</SelectItem>
                  <SelectItem value="manager">店長</SelectItem>
                  <SelectItem value="staff">スタッフ</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">メッセージ（任意）</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="オシドリを利用したいきっかけなど"
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "送信中..." : "申請する"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
