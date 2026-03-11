"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store, ArrowLeft, ArrowRight, CheckCircle2, MapPin, Phone,
  Globe, Instagram, Loader2, Search,
} from "lucide-react";
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
import { PREFECTURES, CATEGORIES } from "@/lib/constants";

// ステップ定義
const STEPS = [
  { id: 1, label: "基本情報", icon: Store },
  { id: 2, label: "所在地・連絡先", icon: MapPin },
  { id: 3, label: "確認・送信", icon: CheckCircle2 },
] as const;

export default function ApplyShopOwnerPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isLookingUpPostal, setIsLookingUpPostal] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: 基本情報
    shopName: "",
    shopGenre: "",
    applicantNameSei: "",
    applicantNameMei: "",
    applicantRole: "",
    message: "",
    // Step 2: 所在地・連絡先
    postalCode: "",
    addressPrefecture: "",
    addressCity: "",
    addressStreet: "",
    addressBuilding: "",
    phone1: "",
    phone2: "",
    phone3: "",
    // Step 2: SNS・ウェブサイト
    websiteUrl: "",
    instagramUrl: "",
    tabelogUrl: "",
    gmbUrl: "",
  });

  useEffect(() => {
    const checkAuthAndDraft = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      if (user) {
        try {
          const res = await fetch("/api/shop-application");
          if (res.ok) {
            const data = await res.json();
            if (data.hasPending) {
              setHasPending(true);
            } else if (data.draft) {
              const d = data.draft;
              // 電話番号の分割復元
              const phone = d.phone || "";
              let phone1 = "", phone2 = "", phone3 = "";
              if (phone.length === 10) {
                phone1 = phone.slice(0, 2); phone2 = phone.slice(2, 6); phone3 = phone.slice(6);
              } else if (phone.length === 11) {
                phone1 = phone.slice(0, 3); phone2 = phone.slice(3, 7); phone3 = phone.slice(7);
              } else if (phone) {
                phone1 = phone;
              }

              setFormData({
                shopName: d.shop_name || "",
                shopGenre: d.shop_genre || "",
                applicantNameSei: d.applicant_name_sei || "",
                applicantNameMei: d.applicant_name_mei || "",
                applicantRole: d.applicant_role || "",
                message: d.message || "",
                postalCode: d.postal_code || "",
                addressPrefecture: d.address_prefecture || "",
                addressCity: d.address_city || "",
                addressStreet: d.address_street || "",
                addressBuilding: d.address_building || "",
                phone1, phone2, phone3,
                websiteUrl: d.website_url || "",
                instagramUrl: d.instagram_url || "",
                tabelogUrl: d.tabelog_url || "",
                gmbUrl: d.gmb_url || "",
              });
              setCurrentStep(Math.min((d.application_step || 1) + 1, 3));
            }
          }
        } catch {
          // ドラフトチェック失敗しても続行
        }
      }
    };
    checkAuthAndDraft();
  }, []);

  // 郵便番号から住所を自動入力
  async function lookupPostalCode() {
    const code = formData.postalCode.replace(/[-\s〒]/g, "");
    if (!/^\d{7}$/.test(code)) {
      setError("郵便番号は7桁の数字で入力してください");
      return;
    }
    setIsLookingUpPostal(true);
    setError(null);
    try {
      const res = await fetch(`/api/postal-code?code=${code}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "住所の検索に失敗しました");
        return;
      }
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        addressPrefecture: data.prefecture || prev.addressPrefecture,
        addressCity: data.city || prev.addressCity,
        addressStreet: data.street || prev.addressStreet,
      }));
    } catch {
      setError("住所の検索に失敗しました");
    } finally {
      setIsLookingUpPostal(false);
    }
  }

  // 電話番号の結合
  function getPhoneNumber(): string {
    return `${formData.phone1}${formData.phone2}${formData.phone3}`;
  }

  // 電話番号フォーマット表示用
  function formatPhone(): string {
    const p = getPhoneNumber();
    if (p.length === 10) return `${p.slice(0,2)}-${p.slice(2,6)}-${p.slice(6)}`;
    if (p.length === 11) return `${p.slice(0,3)}-${p.slice(3,7)}-${p.slice(7)}`;
    return p;
  }

  // Step1 バリデーション
  function validateStep1(): string | null {
    if (!formData.shopName.trim()) return "店名を入力してください";
    if (!formData.applicantNameSei.trim()) return "姓を入力してください";
    if (!formData.applicantNameMei.trim()) return "名を入力してください";
    return null;
  }

  // Step2 バリデーション
  function validateStep2(): string | null {
    if (!formData.addressPrefecture) return "都道府県を選択してください";
    if (!formData.addressCity.trim()) return "市区町村を入力してください";
    if (!formData.addressStreet.trim()) return "町名番地を入力してください";
    const phone = getPhoneNumber();
    if (!phone) return "電話番号を入力してください";
    if (!/^0\d{9,10}$/.test(phone)) {
      return "正しい電話番号を入力してください";
    }
    return null;
  }

  // ステップ1を保存してStep2へ
  async function saveStep1() {
    setError(null);
    const err = validateStep1();
    if (err) { setError(err); return; }

    setIsSaving(true);
    try {
      const res = await fetch("/api/shop-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 1,
          shop_name: formData.shopName,
          shop_genre: formData.shopGenre || null,
          applicant_name: `${formData.applicantNameSei} ${formData.applicantNameMei}`,
          applicant_name_sei: formData.applicantNameSei,
          applicant_name_mei: formData.applicantNameMei,
          applicant_role: formData.applicantRole || null,
          message: formData.message || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }

      setSavedMessage("基本情報を保存しました");
      setTimeout(() => setSavedMessage(null), 2000);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  }

  // ステップ2を保存してStep3へ
  async function saveStep2() {
    setError(null);
    const err = validateStep2();
    if (err) { setError(err); return; }

    setIsSaving(true);
    try {
      const phone = getPhoneNumber();
      const postalCode = formData.postalCode.replace(/[-\s〒]/g, "");
      const res = await fetch("/api/shop-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 2,
          postal_code: postalCode || null,
          address_prefecture: formData.addressPrefecture,
          address_city: formData.addressCity,
          address_street: formData.addressStreet,
          address_building: formData.addressBuilding || null,
          phone,
          website_url: formData.websiteUrl || null,
          instagram_url: formData.instagramUrl || null,
          tabelog_url: formData.tabelogUrl || null,
          gmb_url: formData.gmbUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }

      setSavedMessage("所在地情報を保存しました");
      setTimeout(() => setSavedMessage(null), 2000);
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  }

  // 最終送信
  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/shop-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: 3 }),
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

  function handleBack() {
    setError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  if (isLoggedIn === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Store className="h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">アカウント登録が必要です</h1>
        <p className="mt-2 text-muted-foreground">
          店舗の登録にはアカウントが必要です。
          <br />
          メールアドレスまたはGoogleアカウントで登録できます。
        </p>
        <Button className="mt-6" asChild>
          <Link href="/login?next=/apply-shop-owner">アカウントを作成 / ログイン</Link>
        </Button>
      </div>
    );
  }

  // 審査中の申請がある場合
  if (hasPending) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Clock className="h-16 w-16 text-yellow-500" />
        <h1 className="mt-6 text-2xl font-bold">審査中の申請があります</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          現在、審査中の店舗申請があります。
          審査結果はメールでお知らせします。通常1-2営業日以内にご連絡いたします。
        </p>
        <Button className="mt-8" asChild>
          <Link href="/home">ホームに戻る</Link>
        </Button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h1 className="mt-6 text-2xl font-bold">店舗登録を受け付けました</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          審査結果はメールでお知らせします。
          通常1-2営業日以内にご連絡いたします。
          承認後、すぐにダッシュボードをご利用いただけます。
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
        href="/for-shops"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        飲食店向けページに戻る
      </Link>

      {/* ステップインジケーター */}
      <div className="mb-2 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          ステップ <span className="text-lg font-bold text-primary">{currentStep}</span> / <span className="text-lg font-bold">3</span>
        </p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-1 sm:gap-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                    : currentStep > step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <span className={`text-[10px] sm:text-xs leading-tight ${
                currentStep >= step.id ? "text-foreground font-medium" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 sm:w-12 mb-5 ${
                currentStep > step.id ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* 保存成功メッセージ */}
      {savedMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {savedMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {currentStep === 1 && <Store className="h-5 w-5 text-primary" />}
              {currentStep === 2 && <MapPin className="h-5 w-5 text-primary" />}
              {currentStep === 3 && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <CardTitle>
                {currentStep === 1 && "店舗の基本情報"}
                {currentStep === 2 && "所在地・連絡先"}
                {currentStep === 3 && "入力内容の確認"}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentStep === 1 && "まずはお店の基本的な情報を教えてください"}
                {currentStep === 2 && "実在確認のため住所と連絡先をお願いします"}
                {currentStep === 3 && "内容をご確認の上、送信してください"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}

          {/* Step 1: 基本情報 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="shopName">店名 *</Label>
                <Input
                  id="shopName"
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

              {/* 姓・名の分割入力 */}
              <div>
                <Label>お名前 *</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      id="applicantNameSei"
                      value={formData.applicantNameSei}
                      onChange={(e) =>
                        setFormData({ ...formData, applicantNameSei: e.target.value })
                      }
                      placeholder="姓（例: 山田）"
                    />
                  </div>
                  <div>
                    <Input
                      id="applicantNameMei"
                      value={formData.applicantNameMei}
                      onChange={(e) =>
                        setFormData({ ...formData, applicantNameMei: e.target.value })
                      }
                      placeholder="名（例: 太郎）"
                    />
                  </div>
                </div>
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

              <Button onClick={saveStep1} className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    次へ（ステップ 2/3 へ）
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                ※ 入力内容は自動保存されます。途中で中断しても再開できます。
              </p>
            </div>
          )}

          {/* Step 2: 所在地・連絡先・SNS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* 郵便番号 */}
              <div>
                <Label htmlFor="postalCode">〒 郵便番号</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d-]/g, "");
                      setFormData({ ...formData, postalCode: val });
                    }}
                    placeholder="例: 152-0033"
                    className="flex-1"
                    maxLength={8}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={lookupPostalCode}
                    disabled={isLookingUpPostal}
                    className="shrink-0"
                  >
                    {isLookingUpPostal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="mr-1 h-3.5 w-3.5" />
                        住所検索
                      </>
                    )}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  郵便番号を入力して「住所検索」を押すと自動入力されます
                </p>
              </div>

              <div>
                <Label htmlFor="addressPrefecture">都道府県 *</Label>
                <Select
                  value={formData.addressPrefecture}
                  onValueChange={(v) =>
                    setFormData({ ...formData, addressPrefecture: v })
                  }
                >
                  <SelectTrigger id="addressPrefecture">
                    <SelectValue placeholder="都道府県を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFECTURES.map((pref) => (
                      <SelectItem key={pref} value={pref}>
                        {pref}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="addressCity">市区町村 *</Label>
                <Input
                  id="addressCity"
                  value={formData.addressCity}
                  onChange={(e) =>
                    setFormData({ ...formData, addressCity: e.target.value })
                  }
                  placeholder="例: 目黒区大岡山"
                />
              </div>

              <div>
                <Label htmlFor="addressStreet">町名番地 *</Label>
                <Input
                  id="addressStreet"
                  value={formData.addressStreet}
                  onChange={(e) =>
                    setFormData({ ...formData, addressStreet: e.target.value })
                  }
                  placeholder="例: 1-2-3"
                />
              </div>

              <div>
                <Label htmlFor="addressBuilding">建物名（任意）</Label>
                <Input
                  id="addressBuilding"
                  value={formData.addressBuilding}
                  onChange={(e) =>
                    setFormData({ ...formData, addressBuilding: e.target.value })
                  }
                  placeholder="例: ○○ビル 2F"
                />
              </div>

              {/* 電話番号 3分割 */}
              <div>
                <Label>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    電話番号 *
                  </span>
                </Label>
                <div className="mt-1 flex items-center gap-1">
                  <Input
                    type="tel"
                    value={formData.phone1}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setFormData({ ...formData, phone1: val });
                      if (val.length >= 2 && val.length <= 4) {
                        const next = document.getElementById("phone2");
                        if (next && val.length >= 2) next.focus();
                      }
                    }}
                    placeholder="03"
                    className="w-20 text-center"
                    maxLength={4}
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    id="phone2"
                    type="tel"
                    value={formData.phone2}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setFormData({ ...formData, phone2: val });
                      if (val.length >= 4) {
                        const next = document.getElementById("phone3");
                        if (next) next.focus();
                      }
                    }}
                    placeholder="1234"
                    className="w-24 text-center"
                    maxLength={4}
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    id="phone3"
                    type="tel"
                    value={formData.phone3}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setFormData({ ...formData, phone3: val });
                    }}
                    placeholder="5678"
                    className="w-24 text-center"
                    maxLength={4}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  市外局番から入力してください
                </p>
              </div>

              {/* SNS・ウェブサイト情報（任意） */}
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  SNS・ウェブサイト（任意）
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  入力いただくと審査がスムーズになります
                </p>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="websiteUrl" className="text-xs">ホームページ</Label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, websiteUrl: e.target.value })
                      }
                      placeholder="https://example.com"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagramUrl" className="text-xs flex items-center gap-1">
                      <Instagram className="h-3.5 w-3.5" />
                      Instagram
                    </Label>
                    <Input
                      id="instagramUrl"
                      type="url"
                      value={formData.instagramUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, instagramUrl: e.target.value })
                      }
                      placeholder="https://instagram.com/yourshop"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tabelogUrl" className="text-xs">食べログ</Label>
                    <Input
                      id="tabelogUrl"
                      type="url"
                      value={formData.tabelogUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, tabelogUrl: e.target.value })
                      }
                      placeholder="https://tabelog.com/..."
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gmbUrl" className="text-xs">Googleマップ / ビジネスプロフィール</Label>
                    <Input
                      id="gmbUrl"
                      type="url"
                      value={formData.gmbUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, gmbUrl: e.target.value })
                      }
                      placeholder="https://maps.google.com/..."
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  戻る
                </Button>
                <Button onClick={saveStep2} className="flex-1" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      確認へ（ステップ 3/3 へ）
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                ※ 入力内容は自動保存されます。途中で中断しても再開できます。
              </p>
            </div>
          )}

          {/* Step 3: 確認・送信 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">基本情報</h3>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">店名</span>
                  <span className="font-medium">{formData.shopName}</span>
                  <span className="text-muted-foreground">ジャンル</span>
                  <span>{formData.shopGenre || "未選択"}</span>
                  <span className="text-muted-foreground">お名前</span>
                  <span>{formData.applicantNameSei} {formData.applicantNameMei}</span>
                  <span className="text-muted-foreground">役割</span>
                  <span>
                    {formData.applicantRole === "owner" && "オーナー"}
                    {formData.applicantRole === "manager" && "店長"}
                    {formData.applicantRole === "staff" && "スタッフ"}
                    {formData.applicantRole === "other" && "その他"}
                    {!formData.applicantRole && "未選択"}
                  </span>
                  {formData.message && (
                    <>
                      <span className="text-muted-foreground">メッセージ</span>
                      <span>{formData.message}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">所在地・連絡先</h3>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {formData.postalCode && (
                    <>
                      <span className="text-muted-foreground">郵便番号</span>
                      <span>〒{formData.postalCode}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">住所</span>
                  <span>
                    {formData.addressPrefecture} {formData.addressCity} {formData.addressStreet}
                    {formData.addressBuilding && ` ${formData.addressBuilding}`}
                  </span>
                  <span className="text-muted-foreground">電話番号</span>
                  <span>{formatPhone()}</span>
                </div>
              </div>

              {/* SNS情報があれば表示 */}
              {(formData.websiteUrl || formData.instagramUrl || formData.tabelogUrl || formData.gmbUrl) && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">SNS・ウェブサイト</h3>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {formData.websiteUrl && (
                      <>
                        <span className="text-muted-foreground">HP</span>
                        <span className="truncate">{formData.websiteUrl}</span>
                      </>
                    )}
                    {formData.instagramUrl && (
                      <>
                        <span className="text-muted-foreground">Instagram</span>
                        <span className="truncate">{formData.instagramUrl}</span>
                      </>
                    )}
                    {formData.tabelogUrl && (
                      <>
                        <span className="text-muted-foreground">食べログ</span>
                        <span className="truncate">{formData.tabelogUrl}</span>
                      </>
                    )}
                    {formData.gmbUrl && (
                      <>
                        <span className="text-muted-foreground">Google</span>
                        <span className="truncate">{formData.gmbUrl}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                ※ 審査通過後、より詳しい店舗情報（営業時間、写真等）を
                ダッシュボードから登録いただけます。
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  修正する
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    "この内容で申請する"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Clock コンポーネント（審査中表示用）
function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
