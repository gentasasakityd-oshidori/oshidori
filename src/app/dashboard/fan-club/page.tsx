"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crown,
  Check,
  Edit3,
  Gift,
  Sparkles,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FAN_CLUB_TEMPLATES, FAN_CLUB_BENEFIT_OPTIONS, POC_FREE_MODE } from "@/lib/constants";
import type { FanClubTemplateKey } from "@/lib/constants";
import { Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { FanClubBenefitTracker } from "@/components/dashboard/fan-club-benefit-tracker";
import { FanClubAiAdvisor } from "@/components/dashboard/fan-club-ai-advisor";

// ────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────
type FanClubPlan = {
  id: string;
  shop_id: string;
  plan_name: string;
  price: number;
  description: string | null;
  benefits: string[];
  template_base: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  join_conditions?: Record<string, unknown>;
  calendar_config?: Record<string, unknown>;
};

type FormData = {
  plan_name: string;
  price: number;
  description: string;
  benefits: string[];
  customBenefit: string;
  template_base: FanClubTemplateKey | null;
};

// ────────────────────────────────────────────
// テンプレートカード
// ────────────────────────────────────────────
const TEMPLATE_ENTRIES: {
  key: FanClubTemplateKey;
  accent: string;
  icon: string;
  border: string;
  bg: string;
}[] = [
  {
    key: "light",
    accent: "text-amber-600",
    icon: "bg-amber-50",
    border: "border-amber-200 hover:border-amber-300",
    bg: "bg-amber-50/50",
  },
  {
    key: "standard",
    accent: "text-primary",
    icon: "bg-primary/10",
    border: "border-primary/30 hover:border-primary/50",
    bg: "bg-primary/5",
  },
  {
    key: "premium",
    accent: "text-violet-600",
    icon: "bg-violet-50",
    border: "border-violet-200 hover:border-violet-300",
    bg: "bg-violet-50/50",
  },
];

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function FanClubPage() {
  const [plan, setPlan] = useState<FanClubPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  // UI状態
  const [view, setView] = useState<"templates" | "form" | "detail">("templates");
  const [isEditing, setIsEditing] = useState(false);

  // フォーム状態
  const [form, setForm] = useState<FormData>({
    plan_name: "",
    price: 0,
    description: "",
    benefits: [],
    customBenefit: "",
    template_base: null,
  });

  // ────────────────────────────────────────
  // データ取得
  // ────────────────────────────────────────
  const loadPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/fan-club");
      if (!res.ok) {
        if (res.status === 401) {
          setError("ログインが必要です");
        } else {
          setError("データの読み込みに失敗しました");
        }
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setView("detail");
        // メンバー数（推し登録数）を取得
        if (data.memberCount != null) {
          setMemberCount(data.memberCount);
        } else {
          // APIがmemberCountを返さない場合、別途取得
          fetch("/api/dashboard/fan-club/members")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.count != null) setMemberCount(d.count); })
            .catch(() => {});
        }
      } else {
        setView("templates");
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // ────────────────────────────────────────
  // テンプレート選択
  // ────────────────────────────────────────
  function selectTemplate(key: FanClubTemplateKey) {
    const tmpl = FAN_CLUB_TEMPLATES[key];
    setForm({
      plan_name: tmpl.name,
      price: tmpl.price,
      description: tmpl.description,
      benefits: [...tmpl.benefits],
      customBenefit: "",
      template_base: key,
    });
    setView("form");
  }

  // ────────────────────────────────────────
  // 既存プランの編集開始
  // ────────────────────────────────────────
  function startEditing() {
    if (!plan) return;
    setForm({
      plan_name: plan.plan_name,
      price: plan.price,
      description: plan.description || "",
      benefits: [...plan.benefits],
      customBenefit: "",
      template_base: (plan.template_base as FanClubTemplateKey) || null,
    });
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  // ────────────────────────────────────────
  // 特典トグル
  // ────────────────────────────────────────
  function toggleBenefit(benefit: string) {
    setForm((prev) => ({
      ...prev,
      benefits: prev.benefits.includes(benefit)
        ? prev.benefits.filter((b) => b !== benefit)
        : [...prev.benefits, benefit],
    }));
  }

  // ────────────────────────────────────────
  // カスタム特典追加
  // ────────────────────────────────────────
  function addCustomBenefit() {
    const text = form.customBenefit.trim();
    if (!text) return;
    if (form.benefits.includes(text)) {
      toast.error("同じ特典が既に追加されています");
      return;
    }
    setForm((prev) => ({
      ...prev,
      benefits: [...prev.benefits, text],
      customBenefit: "",
    }));
  }

  // ────────────────────────────────────────
  // カスタム特典削除（プリセットにない特典）
  // ────────────────────────────────────────
  function removeCustomBenefit(benefit: string) {
    setForm((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((b) => b !== benefit),
    }));
  }

  // ────────────────────────────────────────
  // 新規プラン作成
  // ────────────────────────────────────────
  async function handleCreate() {
    if (!form.plan_name.trim()) {
      toast.error("プラン名を入力してください");
      return;
    }
    if (form.benefits.length === 0) {
      toast.error("特典を1つ以上選択してください");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/dashboard/fan-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: form.plan_name.trim(),
          price: form.price,
          description: form.description.trim(),
          benefits: form.benefits,
          template_base: form.template_base,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "作成に失敗しました");
        setIsSaving(false);
        return;
      }

      setPlan(data.plan);
      setView("detail");
      toast.success("ファンクラブを公開しました！");
    } catch {
      toast.error("ネットワークエラーが発生しました");
    }
    setIsSaving(false);
  }

  // ────────────────────────────────────────
  // プラン更新
  // ────────────────────────────────────────
  async function handleUpdate() {
    if (!form.plan_name.trim()) {
      toast.error("プラン名を入力してください");
      return;
    }
    if (form.benefits.length === 0) {
      toast.error("特典を1つ以上選択してください");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/dashboard/fan-club", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: form.plan_name.trim(),
          price: form.price,
          description: form.description.trim(),
          benefits: form.benefits,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "更新に失敗しました");
        setIsSaving(false);
        return;
      }

      setPlan(data.plan);
      setIsEditing(false);
      toast.success("プランを更新しました");
    } catch {
      toast.error("ネットワークエラーが発生しました");
    }
    setIsSaving(false);
  }

  // ────────────────────────────────────────
  // 公開/非公開トグル
  // ────────────────────────────────────────
  async function handleToggleActive(checked: boolean) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/dashboard/fan-club", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: checked }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "更新に失敗しました");
        setIsSaving(false);
        return;
      }

      setPlan(data.plan);
      toast.success(checked ? "ファンクラブを公開しました" : "ファンクラブを非公開にしました");
    } catch {
      toast.error("ネットワークエラーが発生しました");
    }
    setIsSaving(false);
  }

  // ────────────────────────────────────────
  // ローディング
  // ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ────────────────────────────────────────
  // 認証エラー
  // ────────────────────────────────────────
  if (error === "ログインが必要です") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href="/login">ログインする</Link>
        </Button>
      </div>
    );
  }

  // ────────────────────────────────────────
  // カスタム特典一覧（プリセットにないもの）
  // ────────────────────────────────────────
  const presetBenefits = FAN_CLUB_BENEFIT_OPTIONS as readonly string[];
  const customBenefitsInForm = form.benefits.filter(
    (b) => !presetBenefits.includes(b),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ページタイトル */}
      <div>
        <h1 className="text-2xl font-bold">ファンクラブ運営</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ファンクラブを作成して、お店のいちばんの応援者とつながりましょう
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ──────────────────────────── */}
      {/* テンプレート選択画面 */}
      {/* ──────────────────────────── */}
      {view === "templates" && (
        <>
          {/* PoC無料モードバナー */}
          {POC_FREE_MODE && (
            <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-bold text-amber-800">プレオープン特別無料期間</p>
                  <p className="mt-1 text-sm text-amber-700">
                    現在PoC期間中のため、ファンクラブへの参加は無料です。
                    推し登録してくれたお客さんが自動的にファンクラブメンバーになります。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 導入セクション */}
          <Card className="border-primary/20 bg-warm">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">ファンクラブをはじめましょう</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  テンプレートを選んでカスタマイズするだけで簡単に始められます。
                  {POC_FREE_MODE
                    ? "プレオープン期間中は無料でお試しいただけます。"
                    : "月額料金や特典は自由に設定できます。"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* テンプレートカード群 */}
          <div className="grid gap-4 sm:grid-cols-3">
            {TEMPLATE_ENTRIES.map(({ key, accent, icon, border, bg }) => {
              const tmpl = FAN_CLUB_TEMPLATES[key];
              return (
                <Card
                  key={key}
                  className={`relative overflow-hidden transition-all ${border}`}
                >
                  {/* 推奨バッジ（スタンダードのみ） */}
                  {key === "standard" && (
                    <div className="absolute right-2 top-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                        <Sparkles className="h-3 w-3" />
                        おすすめ
                      </span>
                    </div>
                  )}

                  <CardHeader className={`pb-2 ${bg}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${icon}`}
                      >
                        <Crown className={`h-4 w-4 ${accent}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${accent}`}>
                          {tmpl.name}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2">
                      <span className={`text-2xl font-bold ${accent}`}>
                        {tmpl.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        円/月
                      </span>
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-3">
                    <p className="text-xs text-muted-foreground">
                      {tmpl.description}
                    </p>

                    <ul className="space-y-1.5">
                      {tmpl.benefits.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-1.5 text-xs"
                        >
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      variant={key === "standard" ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectTemplate(key)}
                    >
                      このプランをベースにする
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ──────────────────────────── */}
      {/* カスタマイズフォーム（新規作成） */}
      {/* ──────────────────────────── */}
      {view === "form" && (
        <>
          {/* 戻るボタン */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("templates")}
            className="text-muted-foreground"
          >
            ← テンプレート選択に戻る
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">プランをカスタマイズ</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                テンプレートをベースに、お店に合った内容に変更できます
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* プラン名 */}
              <div className="space-y-2">
                <Label htmlFor="plan_name">プラン名</Label>
                <Input
                  id="plan_name"
                  value={form.plan_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      plan_name: e.target.value,
                    }))
                  }
                  placeholder="例: 常連さんプラン"
                />
              </div>

              {/* 月額料金 */}
              <div className="space-y-2">
                <Label htmlFor="price">月額料金（税込）</Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={100}
                    value={form.price}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    円
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  0円に設定すると無料プランになります
                </p>
              </div>

              {/* 特典チェックリスト */}
              <div className="space-y-3">
                <Label>特典を選択</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FAN_CLUB_BENEFIT_OPTIONS.map((option) => {
                    const isChecked = form.benefits.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleBenefit(option)}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all ${
                          isChecked
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-warm"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            isChecked
                              ? "border-primary bg-primary text-white"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                        <Gift className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* カスタム特典一覧 */}
                {customBenefitsInForm.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      追加した特典:
                    </p>
                    {customBenefitsInForm.map((b) => (
                      <div
                        key={b}
                        className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 p-3 text-sm"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary bg-primary text-white">
                          <Check className="h-3 w-3" />
                        </div>
                        <Gift className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                        <span className="flex-1">{b}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomBenefit(b)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* カスタム特典入力 */}
                <div className="flex gap-2">
                  <Input
                    value={form.customBenefit}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        customBenefit: e.target.value,
                      }))
                    }
                    placeholder="オリジナル特典を追加"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomBenefit();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={addCustomBenefit}
                    disabled={!form.customBenefit.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 説明 */}
              <div className="space-y-2">
                <Label htmlFor="description">説明文</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="ファンクラブの魅力を伝えましょう"
                  rows={3}
                />
              </div>

              {/* プレビュー */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  プレビュー
                </p>
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      <p className="font-bold">
                        {form.plan_name || "プラン名未設定"}
                      </p>
                    </div>
                    <p className="mt-1">
                      <span className="text-xl font-bold text-primary">
                        {form.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        円/月
                      </span>
                    </p>
                    {form.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {form.description}
                      </p>
                    )}
                    {form.benefits.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {form.benefits.map((b) => (
                          <li
                            key={b}
                            className="flex items-center gap-1.5 text-sm"
                          >
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 公開ボタン */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleCreate}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="mr-2 h-4 w-4" />
                )}
                ファンクラブを公開する
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* ──────────────────────────── */}
      {/* 既存プラン詳細・編集画面 */}
      {/* ──────────────────────────── */}
      {view === "detail" && plan && !isEditing && (
        <>
          {/* PoC無料モードバナー */}
          {POC_FREE_MODE && (
            <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="font-bold text-amber-800">プレオープン特別無料期間</p>
                    <p className="text-sm text-amber-700">
                      推し登録 = ファンクラブ自動参加。限定メッセージでファンとつながりましょう！
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-white/80 px-3 py-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{memberCount}</span>
                  <span className="text-[10px] text-muted-foreground">人</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ステータス + 公開トグル */}
          <Card className="border-primary/20 bg-warm">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">ファンクラブ</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.is_active ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Eye className="h-3 w-3" />
                        公開中
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <EyeOff className="h-3 w-3" />
                        非公開
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="active-toggle"
                  className="text-xs text-muted-foreground"
                >
                  {plan.is_active ? "公開" : "非公開"}
                </Label>
                <Switch
                  id="active-toggle"
                  checked={plan.is_active}
                  onCheckedChange={handleToggleActive}
                  disabled={isSaving}
                />
              </div>
            </CardContent>
          </Card>

          {/* プラン詳細カード */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">{plan.plan_name}</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={startEditing}
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                編集
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 料金 */}
              <div>
                <p className="text-xs text-muted-foreground">月額料金</p>
                {POC_FREE_MODE ? (
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">無料</span>
                    <span className="text-sm text-muted-foreground line-through">¥{plan.price.toLocaleString()}/月</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">プレオープン期間</span>
                  </div>
                ) : (
                  <p className="mt-0.5">
                    <span className="text-2xl font-bold text-primary">
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">円/月</span>
                  </p>
                )}
              </div>

              {/* 説明 */}
              {plan.description && (
                <div>
                  <p className="text-xs text-muted-foreground">説明</p>
                  <p className="mt-0.5 text-sm">{plan.description}</p>
                </div>
              )}

              {/* 特典一覧 */}
              <div>
                <p className="text-xs text-muted-foreground">特典</p>
                <ul className="mt-1.5 space-y-1.5">
                  {plan.benefits.map((b) => (
                    <li
                      key={b}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* メタ情報 */}
              <div className="border-t pt-3">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <p>
                    作成:{" "}
                    {new Date(plan.created_at).toLocaleDateString("ja-JP")}
                  </p>
                  <p>
                    更新:{" "}
                    {new Date(plan.updated_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 特典トラッカー */}
          <FanClubBenefitTracker planId={plan.id} />

          {/* AIアドバイザー */}
          <FanClubAiAdvisor shopId={plan.shop_id} />
        </>
      )}

      {/* ──────────────────────────── */}
      {/* 既存プラン編集フォーム */}
      {/* ──────────────────────────── */}
      {view === "detail" && plan && isEditing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">プランを編集</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
              >
                キャンセル
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* プラン名 */}
            <div className="space-y-2">
              <Label htmlFor="edit_plan_name">プラン名</Label>
              <Input
                id="edit_plan_name"
                value={form.plan_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    plan_name: e.target.value,
                  }))
                }
                placeholder="例: 常連さんプラン"
              />
            </div>

            {/* 月額料金 */}
            <div className="space-y-2">
              <Label htmlFor="edit_price">月額料金（税込）</Label>
              <div className="relative">
                <Input
                  id="edit_price"
                  type="number"
                  min={0}
                  step={100}
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                    }))
                  }
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  円
                </span>
              </div>
            </div>

            {/* 特典チェックリスト */}
            <div className="space-y-3">
              <Label>特典を選択</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {FAN_CLUB_BENEFIT_OPTIONS.map((option) => {
                  const isChecked = form.benefits.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleBenefit(option)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all ${
                        isChecked
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-warm"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? "border-primary bg-primary text-white"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                      <Gift className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* カスタム特典一覧 */}
              {customBenefitsInForm.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    追加した特典:
                  </p>
                  {customBenefitsInForm.map((b) => (
                    <div
                      key={b}
                      className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 p-3 text-sm"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </div>
                      <Gift className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      <span className="flex-1">{b}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomBenefit(b)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* カスタム特典入力 */}
              <div className="flex gap-2">
                <Input
                  value={form.customBenefit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customBenefit: e.target.value,
                    }))
                  }
                  placeholder="オリジナル特典を追加"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomBenefit();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addCustomBenefit}
                  disabled={!form.customBenefit.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 説明 */}
            <div className="space-y-2">
              <Label htmlFor="edit_description">説明文</Label>
              <Textarea
                id="edit_description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="ファンクラブの魅力を伝えましょう"
                rows={3}
              />
            </div>

            {/* 保存ボタン */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={cancelEditing}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                変更を保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
