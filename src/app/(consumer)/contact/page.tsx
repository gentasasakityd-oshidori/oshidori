"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const INQUIRY_TYPES = [
  { value: "general", label: "一般的なお問い合わせ" },
  { value: "shop", label: "店舗登録について" },
  { value: "bug", label: "不具合の報告" },
  { value: "other", label: "その他" },
] as const;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    inquiryType: "general",
    message: "",
  });
  const [hpField, setHpField] = useState(""); // ハニーポット
  const [formLoadTime] = useState(Date.now()); // フォーム表示時刻
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ログイン中のユーザー情報を取得して自動入力
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setFormData((prev) => ({
            ...prev,
            email: user.email || "",
          }));
        }
      } catch {
        // 未ログインの場合は無視
      }
    };
    fetchProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          inquiry_type: formData.inquiryType,
          message: formData.message,
          _hp_field: hpField, // ハニーポット
          _form_time: formLoadTime, // フォーム表示時刻
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "送信に失敗しました");
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-warm-light px-4 py-12">
      <div className="w-full max-w-md">
        {/* ブランドヘッダー */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="オシドリ"
            width={160}
            height={44}
            className="mx-auto h-11 w-auto"
          />
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            {isSubmitted ? (
              // 送信完了
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
                <h1 className="mt-4 text-xl font-bold">お問い合わせを受け付けました</h1>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  内容を確認の上、担当者よりご連絡いたします。
                  通常2-3営業日以内にご回答いたします。
                </p>
                <div className="mt-6 space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/home">ホームに戻る</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-xl font-bold">お問い合わせ</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    ご質問、ご意見、不具合のご報告など、お気軽にお問い合わせください。
                  </p>
                </div>

                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* ハニーポット（非表示フィールド） */}
                  <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
                    <input
                      type="text"
                      name="website_url_confirm"
                      tabIndex={-1}
                      autoComplete="off"
                      value={hpField}
                      onChange={(e) => setHpField(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-name">お名前 *</Label>
                    <Input
                      id="contact-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="山田太郎"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-email">メールアドレス *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="contact-email"
                        type="email"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="mail@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-type">お問い合わせ種別</Label>
                    <Select
                      value={formData.inquiryType}
                      onValueChange={(v) =>
                        setFormData({ ...formData, inquiryType: v })
                      }
                    >
                      <SelectTrigger id="contact-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INQUIRY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message">お問い合わせ内容 *</Label>
                    <Textarea
                      id="contact-message"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="お問い合わせ内容をご記入ください（10文字以上）"
                      rows={5}
                      required
                      minLength={10}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        送信する
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/home"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    ホームに戻る
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
