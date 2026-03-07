import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Smartphone,
  Star,
  MessageSquare,
  RefreshCw,
  Mic,
  BookOpen,
  Heart,
  CheckCircle2,
  Clock,
  Shield,
  CreditCard,
  Quote,
  Sparkles,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HeroSection } from "@/components/lp/hero-section";
import { ScrollFadeIn } from "@/components/lp/scroll-fade-in";
import { ComparisonTable } from "@/components/lp/comparison-table";
import { CounterAnimation } from "@/components/lp/counter-animation";

export const metadata: Metadata = {
  title: "飲食店オーナー様へ | オシドリ",
  description:
    "あなたのこだわりは、きっと誰かの推しになる。想いを伝えるだけで、共感するお客さんが集まる。忙しい個人店でも30分で始められます。初期費用0円。",
  openGraph: {
    title: "飲食店オーナー様へ | オシドリ",
    description:
      "想いを伝えるだけで、共感するお客さんが集まる。忙しい個人店でも30分で始められます。初期費用0円。",
    url: "https://oshidori.vercel.app/for-shops",
    type: "website",
  },
  alternates: {
    canonical: "https://oshidori.vercel.app/for-shops",
  },
};

/* ----- 料金プラン ----- */
const PLANS = [
  {
    name: "フリー",
    price: "0",
    priceUnit: "円",
    description: "まずは試してみたい方に",
    features: [
      "インタビュー 1回",
      "ストーリー掲載 1本",
      "基本店舗ページ",
      "共感タップ・推し登録",
      "QRコード生成",
    ],
    cta: "無料で始める",
    highlighted: false,
  },
  {
    name: "スタンダード",
    price: "8,000",
    priceUnit: "円/月",
    description: "ファンとつながりたい方に",
    features: [
      "インタビュー 無制限",
      "ストーリー掲載 無制限",
      "PV・ファン分析",
      "ファンへのメッセージ配信",
      "SNSシェア機能",
    ],
    cta: "無料で始める",
    highlighted: true,
  },
  {
    name: "プレミアム",
    price: "15,000",
    priceUnit: "円/月",
    description: "推しコミュニティを本格運営したい方に",
    features: [
      "スタンダードの全機能",
      "予約打診管理",
      "CRM機能（ファン行動分析）",
      "ファンクラブ運営",
      "データ分析レポート",
    ],
    cta: "お問い合わせ",
    highlighted: false,
  },
];

/* ----- 導入タイムライン ----- */
const TIMELINE = [
  {
    step: "お申し込み",
    time: "5分",
    description: "メールアドレスで簡単登録。クレジットカード不要。",
  },
  {
    step: "インタビュー",
    time: "約30分",
    description:
      "質問に答えるだけで、あなたのお店の想いやこだわりを引き出します。スマホからでもOK。",
  },
  {
    step: "ストーリー確認・公開",
    time: "翌日",
    description:
      "あなたの言葉から生まれたストーリーを確認・編集して公開。すぐにお客さんに届きます。",
  },
  {
    step: "QRコード設置",
    time: "当日〜",
    description:
      "QRコードをダウンロードして店内POPに。来店客にストーリーを読んでもらえます。",
  },
  {
    step: "ファン獲得開始",
    time: "公開直後〜",
    description:
      "共感タップや推し登録が届き始めます。ダッシュボードでリアルタイムに確認。",
  },
];

/* ----- 比較テーブルデータ ----- */
const COMPARISON_ROWS = [
  {
    label: "お客さんの選び方",
    before: "点数・口コミ",
    after: "店主の想い・こだわり",
  },
  {
    label: "伝わるもの",
    before: "メニューと価格",
    after: "ストーリーと人柄",
  },
  {
    label: "つながり",
    before: "1回きりの来店",
    after: "ファンとの継続的な関係",
  },
  {
    label: "集客の仕組み",
    before: "広告費を払い続ける",
    after: "共感が自然に広がる",
  },
  {
    label: "あなたの負担",
    before: "毎日の更新が必要",
    after: "一度話すだけでOK",
  },
];

/* ----- 導入事例（仮データ） ----- */
const TESTIMONIALS = [
  {
    name: "田中 誠一",
    shopName: "炭火焼き鳥 とり源",
    area: "渋谷区",
    comment:
      "SNSが苦手で発信できなかった想いを、ストーリーとして届けられるようになりました。「読んで来ました」と言ってくれるお客さんが増えて本当に嬉しいです。",
  },
  {
    name: "佐藤 恵子",
    shopName: "手打ち蕎麦 あさひ",
    area: "世田谷区",
    comment:
      "30分話しただけなのに、自分でも気づかなかった蕎麦へのこだわりが言葉になっていて驚きました。常連さんが友達を連れてきてくれるようになりました。",
  },
  {
    name: "山田 健太郎",
    shopName: "ナチュラルワイン食堂 hinata",
    area: "目黒区",
    comment:
      "点数で判断されるのが嫌だった。オシドリでは想いに共感してくれるお客さんが来てくれるから、料理にもっと集中できるようになりました。",
  },
];

/* ----- 機能比較表データ ----- */
const FEATURE_TABLE = [
  { feature: "インタビュー", free: "1回", standard: "無制限", premium: "無制限" },
  { feature: "ストーリー掲載", free: "1本", standard: "無制限", premium: "無制限" },
  { feature: "基本店舗ページ", free: true, standard: true, premium: true },
  { feature: "共感タップ・推し登録", free: true, standard: true, premium: true },
  { feature: "QRコード生成", free: true, standard: true, premium: true },
  { feature: "PV・ファン分析", free: false, standard: true, premium: true },
  { feature: "ファンへのメッセージ配信", free: false, standard: true, premium: true },
  { feature: "SNSシェア機能", free: false, standard: true, premium: true },
  { feature: "予約打診管理", free: false, standard: false, premium: true },
  { feature: "CRM機能（ファン行動分析）", free: false, standard: false, premium: true },
  { feature: "ファンクラブ運営", free: false, standard: false, premium: true },
  { feature: "データ分析レポート", free: false, standard: false, premium: true },
];

export default function ForShopsPage() {
  return (
    <>
      {/* ──────────────────────────────────────
          S1. ヒーロー — 感情フック
      ────────────────────────────────────── */}
      <HeroSection
        backgroundImage="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&q=80"
        headline={
          <>
            あなたの&ldquo;こだわり&rdquo;は、
            <br />
            きっと誰かの&ldquo;推し&rdquo;になる。
          </>
        }
        subheadline={
          <>
            想いを伝えるだけで、共感するお客さんが集まる。
            <br className="hidden sm:block" />
            忙しい個人店でも、今日から始められます。
          </>
        }
        actions={
          <>
            <Button
              size="lg"
              className="rounded-full px-8 text-base shadow-lg"
              asChild
            >
              <Link href="/apply-shop-owner">
                無料で始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/40 px-8 text-base text-white hover:bg-white/10"
              asChild
            >
              <Link href="#how-it-works">3分でわかるオシドリ ▷</Link>
            </Button>
          </>
        }
        badge={
          <Badge className="bg-white/95 px-3 py-1.5 text-xs font-bold text-primary shadow-lg backdrop-blur-sm">
            初期費用0円 / 30分で登録完了
          </Badge>
        }
      />

      {/* ──────────────────────────────────────
          S2. 共感 — 飲食店オーナーの悩み
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollFadeIn>
            <h2 className="font-heading text-2xl font-bold md:text-3xl">
              美味しい料理を作っている。
              <br />
              <span className="text-muted-foreground">でも...</span>
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Smartphone,
                text: "SNSの更新が追いつかない。毎日の営業で精一杯",
              },
              {
                icon: Star,
                text: "点数だけで判断されてしまう。味には自信があるのに",
              },
              {
                icon: MessageSquare,
                text: "こだわりを持って料理しているのに、なかなか伝わらない",
              },
              {
                icon: RefreshCw,
                text: "一見さんは来るけど、常連になってくれない",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 100} direction="up">
                <Card className="h-full border-border/40 text-left transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>

          <ScrollFadeIn delay={500}>
            <p className="mt-10 text-lg font-medium">
              オシドリは、あなたの
              <span className="text-primary">&ldquo;想い&rdquo;</span>
              を届ける場所です。
            </p>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S3. 仕組み — こだわりが届くまで
      ────────────────────────────────────── */}
      <section id="how-it-works" className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              想いを伝えるだけ。
              <br className="sm:hidden" />
              あとはオシドリが届けます。
            </h2>
          </ScrollFadeIn>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Mic,
                title: "想いを話す",
                time: "30分",
                desc: "お店のこだわり、食材への想い、お客さんへの気持ち。質問に答えるだけで、あなたの想いを引き出します。",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "ストーリーになる",
                time: "自動",
                desc: "あなたの言葉が、読みやすいストーリーに。お店の魅力が伝わるコンテンツが自動で完成します。",
              },
              {
                step: "03",
                icon: Heart,
                title: "共感が集まる",
                time: "翌日〜",
                desc: "ストーリーを読んだお客さんが推し登録。点数ではなく、想いでつながるファンが生まれます。",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 150} direction="up">
                <Card className="relative h-full overflow-hidden border-primary/20 bg-white shadow-md">
                  <div className="absolute right-3 top-3 font-heading text-5xl font-bold text-primary/8">
                    {item.step}
                  </div>
                  <CardContent className="p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <h3 className="font-heading text-lg font-bold">
                        {item.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {item.time}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S4. 差別化 — なぜオシドリなのか
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              グルメサイトとは、ここが違います。
            </h2>
          </ScrollFadeIn>

          <ScrollFadeIn delay={200}>
            <div className="mt-10">
              <ComparisonTable
                rows={COMPARISON_ROWS}
                beforeHeader="従来のグルメサイト"
                afterHeader="オシドリ"
              />
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S5. 成果 — 数字で見る効果
      ────────────────────────────────────── */}
      <section className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              こだわりが伝わると、お店が変わる。
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Heart,
                value: 120,
                suffix: "回",
                label: "共感タップ 月平均",
              },
              {
                icon: Users,
                value: 73,
                suffix: "%",
                label: "推し登録率",
              },
              {
                icon: TrendingUp,
                value: 45,
                suffix: "%",
                prefix: "",
                label: "リピーター率 向上",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 150} direction="up">
                <Card className="h-full border-none bg-white text-center shadow-md">
                  <CardContent className="p-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <p className="mt-4 font-heading text-4xl font-bold text-primary">
                      <CounterAnimation
                        target={item.value}
                        suffix={item.suffix}
                        prefix={item.prefix}
                        separator={false}
                      />
                    </p>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      {item.label}
                    </p>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>

          <ScrollFadeIn delay={500}>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              ※ β版導入店舗の平均値（2024年10月〜2025年3月）
            </p>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S6. 導入事例 — 店主の声
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              始めた店主の声
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <ScrollFadeIn key={i} delay={i * 150} direction="up">
                <Card className="h-full border-border/30 shadow-sm">
                  <CardContent className="p-6">
                    <Quote className="h-6 w-6 text-primary/30" />
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      {t.comment}
                    </p>
                    <Separator className="my-4" />
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.shopName}（{t.area}）
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S7. 料金プラン
      ────────────────────────────────────── */}
      <section id="plans" className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              料金プラン
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              まずは無料プランからお試しいただけます
            </p>
          </ScrollFadeIn>

          {/* キャンペーンバナー */}
          <ScrollFadeIn delay={150}>
            <div className="mx-auto mt-8 max-w-lg rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 text-center shadow-sm">
              <p className="text-lg font-bold text-primary">
                🎉 リリース記念キャンペーン
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                2026年12月まで、すべての機能が無料！
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                スタンダード・プレミアムプランの機能もすべてお試しいただけます。
                <br />
                無料期間終了後も、フリープランは永久無料です。
              </p>
            </div>
          </ScrollFadeIn>

          {/* プランカード */}
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <ScrollFadeIn key={plan.name} delay={i * 120} direction="up">
                <Card
                  className={`relative h-full overflow-hidden ${
                    plan.highlighted
                      ? "border-2 border-primary shadow-lg"
                      : "border-border"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground">
                      おすすめ
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-heading text-lg font-bold">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">
                        {plan.priceUnit}
                      </span>
                    </div>
                    <Separator className="my-4" />
                    <ul className="space-y-2.5">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-6 w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/apply-shop-owner">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>

          {/* 信頼バッジ */}
          <ScrollFadeIn delay={400}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {[
                { icon: Shield, text: "初期費用0円" },
                { icon: CreditCard, text: "クレジットカード不要" },
                { icon: Clock, text: "いつでも解約OK" },
              ].map((badge) => (
                <div
                  key={badge.text}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <badge.icon className="h-4 w-4" />
                  {badge.text}
                </div>
              ))}
            </div>
          </ScrollFadeIn>

          {/* 機能比較表 */}
          <ScrollFadeIn delay={300}>
            <div className="mt-12">
              <h3 className="text-center text-lg font-bold">機能比較</h3>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                活用度合い・利用目的に合わせてプランをお選びください
              </p>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-border/30">
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">
                        機能
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        フリー
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-primary">
                        スタンダード
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        プレミアム
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_TABLE.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-b border-border/20 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {row.feature}
                        </td>
                        {(["free", "standard", "premium"] as const).map(
                          (plan) => (
                            <td key={plan} className="px-4 py-3 text-center">
                              {typeof row[plan] === "boolean" ? (
                                row[plan] ? (
                                  <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )
                              ) : (
                                <span className="text-sm font-medium">
                                  {row[plan]}
                                </span>
                              )}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S8. 導入フロー — タイムライン
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              今日から、あなたのストーリーを届けよう。
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 space-y-0">
            {TIMELINE.map((item, index) => (
              <ScrollFadeIn key={item.step} delay={index * 100} direction="left">
                <div className="relative flex gap-4 pb-8 last:pb-0">
                  {/* タイムラインの線 */}
                  {index < TIMELINE.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-full w-px bg-primary/20" />
                  )}
                  {/* ドット */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div className="pt-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.step}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        {item.time}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S9. CTA — 最終アクション
      ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 px-4 py-16 text-primary-foreground md:py-24">
        {/* 装飾 */}
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <ScrollFadeIn>
            <Sparkles className="mx-auto h-10 w-10" />
            <h2 className="mt-6 font-heading text-2xl font-bold leading-tight md:text-4xl">
              あなたの想いを、
              <br />
              待っている人がいます。
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed opacity-90 md:text-base">
              30分の対話から、新しい出会いが始まります。初期費用0円。
            </p>

            <Button
              size="lg"
              variant="secondary"
              className="mt-8 rounded-full px-10 text-base shadow-lg"
              asChild
            >
              <Link href="/apply-shop-owner">
                無料で始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            {/* 信頼バッジ */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs opacity-80">
              {["初期費用0円", "クレジットカード不要", "いつでも解約OK"].map(
                (text) => (
                  <span key={text} className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {text}
                  </span>
                ),
              )}
            </div>
          </ScrollFadeIn>
        </div>
      </section>
    </>
  );
}
