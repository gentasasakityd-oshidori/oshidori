import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Smartphone,
  MessageSquare,
  RefreshCw,
  Mic,
  BookOpen,
  Heart,
  CheckCircle2,
  Clock,
  Shield,
  Sparkles,
  Star,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HeroSection } from "@/components/lp/hero-section";
import { ScrollFadeIn } from "@/components/lp/scroll-fade-in";

export const metadata: Metadata = {
  title: "飲食店オーナー様へ | オシドリ",
  description:
    "あなたのこだわりは、きっと誰かの推しになる。こだわりを言葉にするだけで、あなたのファンが増えていく。SNS更新も、文章作成も、いらない。",
  openGraph: {
    title: "飲食店オーナー様へ | オシドリ",
    description:
      "こだわりを言葉にするだけで、あなたのファンが増えていく。SNS更新も、文章作成も、いらない。",
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
      "店舗ページ・QRコード",
      "共感タップ・推し登録",
    ],
    note: "※ 登録から3ヶ月間ご利用いただけます",
    cta: "すぐに始める",
    highlighted: false,
  },
  {
    name: "スタンダード",
    price: "8,000",
    priceUnit: "円/月",
    description: "ファンとつながりたい方に",
    features: [
      "インタビュー・ストーリー 無制限",
      "アクセス・ファン分析",
      "ファンへのメッセージ配信",
      "SNSシェア機能",
    ],
    note: "",
    cta: "すぐに始める",
    highlighted: true,
  },
  {
    name: "プレミアム",
    price: "15,000",
    priceUnit: "円/月",
    description: "常連づくりを本格的にしたい方に",
    features: [
      "スタンダードの全機能",
      "予約打診・来店促進",
      "ファン行動分析（CRM）",
      "データレポート",
    ],
    note: "",
    cta: "お問い合わせ",
    highlighted: false,
  },
];

/* ----- 導入タイムライン ----- */
const TIMELINE = [
  {
    step: "お申し込み",
    time: "5分",
    description: "メールアドレスで簡単登録。",
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
      "QRコードをダウンロードして店内に設置可能。来店客にストーリーを読んでもらえます。",
  },
  {
    step: "ファン獲得開始",
    time: "公開直後〜",
    description:
      "共感タップや推し登録が届き始めます。ダッシュボードでリアルタイムに確認。",
  },
];

/* ----- 機能比較表データ ----- */
const FEATURE_TABLE = [
  { feature: "インタビュー・ストーリー", free: "1回/1本", standard: "無制限", premium: "無制限" },
  { feature: "店舗ページ・QRコード", free: true, standard: true, premium: true },
  { feature: "共感タップ・推し登録", free: true, standard: true, premium: true },
  { feature: "アクセス・ファン分析", free: false, standard: true, premium: true },
  { feature: "メッセージ配信・SNSシェア", free: false, standard: true, premium: true },
  { feature: "予約打診・来店促進", free: false, standard: false, premium: "今後リリース予定" },
  { feature: "ファン行動分析（CRM）", free: false, standard: false, premium: "今後リリース予定" },
  { feature: "データレポート", free: false, standard: false, premium: "今後リリース予定" },
];

export default function ForShopsPage() {
  return (
    <>
      {/* ──────────────────────────────────────
          S1. ヒーロー — 感情フック
      ────────────────────────────────────── */}
      <HeroSection
        backgroundImage="/images/lp/hero-shop-owner.webp"
        headline={
          <>
            あなたの&ldquo;こだわり&rdquo;は、
            <br />
            きっと誰かの&ldquo;推し&rdquo;になる。
          </>
        }
        subheadline={
          <>
            こだわりを言葉にするだけで、あなたのファンが増えていく。
            <br className="hidden sm:block" />
            SNS更新も、文章作成も、いらない。
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
                すぐに始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              className="rounded-full border-2 border-white bg-white/20 px-8 text-base font-bold text-white shadow-lg backdrop-blur-sm hover:bg-white/30"
              asChild
            >
              <Link href="#how-it-works">3分でわかるオシドリ ▷</Link>
            </Button>
          </>
        }
        badge={
          <Link href="/apply-shop-owner">
            <Badge className="bg-white/95 px-3 py-1.5 text-xs font-bold text-primary shadow-lg backdrop-blur-sm cursor-pointer hover:bg-white">
              30分で登録完了
            </Badge>
          </Link>
        }
      />

      {/* ──────────────────────────────────────
          S2. 共感 — 飲食店オーナーの悩み
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollFadeIn>
            <h2 className="text-balance font-heading text-2xl font-bold md:text-3xl">
              美味しい料理を作っている。
              <br />
              <span className="text-muted-foreground">でも...</span>
            </h2>
          </ScrollFadeIn>

          <ScrollFadeIn delay={100}>
            <div className="mt-8 space-y-2">
              {[
                { icon: MessageSquare, text: "こだわりが、なかなか伝わらない" },
                { icon: Smartphone, text: "SNSの更新が追いつかない" },
                { icon: Star, text: "口コミの点数だけで判断されてしまう" },
                { icon: RefreshCw, text: "一見さんが常連になってくれない" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-4 py-2.5 shadow-sm"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-primary/60" />
                  <p className="text-base text-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn delay={500}>
            <p className="text-balance mt-8 text-base font-medium md:text-lg">
              オシドリは、
              <br className="sm:hidden" />
              <span className="text-primary">あなたのストーリーに共感した</span>
              <br className="sm:hidden" />
              <span className="text-primary">お客さんが自然と常連になる</span>
              <br className="sm:hidden" />
              仕組みです。
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
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              想いを伝えるだけ。
              <br className="sm:hidden" />
              あとはオシドリが届けます。
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Mic,
                title: "インタビューに答える",
                time: "30分",
                desc: "用意された質問に答えるだけ。あなたのこだわりや想いを引き出します。",
                image: "/images/lp/shop-step-talk.webp",
                imageAlt: "店主がインタビューで想いを語る様子",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "ストーリーになる",
                time: "自動",
                desc: "あなたの言葉をもとに、お客さんに届くストーリーを作成します。",
                image: "/images/lp/shop-step-story.webp",
                imageAlt: "店主の言葉がストーリーコンテンツになる様子",
              },
              {
                step: "03",
                icon: Heart,
                title: "共感が集まる",
                time: "翌日〜",
                desc: "ストーリーに共感したお客さんが推し登録。来店や常連づくりにつながります。",
                image: "/images/lp/shop-step-fans.webp",
                imageAlt: "共感したお客さんがファンになる様子",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 150} direction="up">
                <Card className="relative h-full overflow-hidden border-primary/20 bg-white shadow-md">
                  <div className="aspect-[3/2] overflow-hidden bg-muted">
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      className="h-full w-full object-cover"
                    />
                    {/* ステップ番号オーバーレイ */}
                    <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                      {item.step}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5 text-primary" />
                      <h3 className="font-heading text-base font-bold">
                        {item.title}
                      </h3>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.time}
                      </Badge>
                    </div>
                    <p className="text-pretty mt-2 text-sm leading-relaxed text-muted-foreground">
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
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              オシドリが選ばれる理由
            </h2>
          </ScrollFadeIn>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              {
                icon: MessageSquare,
                title: "話すだけで完成",
                desc: "SNS更新も文章作成も不要。30分のインタビューに答えるだけでストーリーが完成。",
              },
              {
                icon: Heart,
                title: "想いで選ばれる",
                desc: "口コミや点数ではなく、あなたのこだわりに共感した人が来店する。",
              },
              {
                icon: Users,
                title: "常連が増える",
                desc: "推し登録したお客さんは、何度も通ってくれるファンに。",
              },
              {
                icon: TrendingUp,
                title: "発信コストは最小限、届く力は最大限",
                desc: "掲載料も広告費もなし。共感が自然に広がり、新しいお客さんとの出会いが生まれます。",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 100} direction="up">
                <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-card p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{item.title}</h3>
                    <p className="text-pretty mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S5. 成果 — 数字で見る効果
      ────────────────────────────────────── */}
      <section className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              こだわりが伝わると、
              <br className="sm:hidden" />
              お店が変わる。
            </h2>
          </ScrollFadeIn>

          <ScrollFadeIn delay={150}>
            <div className="mt-8 grid grid-cols-3 gap-2">
              {[
                { label: "共感タップ\n月平均", suffix: "回" },
                { label: "推し登録率", suffix: "%" },
                { label: "リピーター率\n向上", suffix: "%" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white p-3 text-center shadow-sm"
                >
                  <p className="font-heading text-2xl font-bold text-primary md:text-3xl">
                    —
                  </p>
                  <p className="mt-1 whitespace-pre-line text-xs font-medium text-muted-foreground md:text-sm">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn delay={400}>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              ※ 現在計測中です
            </p>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S6. 店主の声
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              店主の声
            </h2>
          </ScrollFadeIn>

          <ScrollFadeIn delay={150}>
            <div className="mt-8 flex justify-center">
              <Card className="max-w-md border-border/30 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-4 text-base text-muted-foreground">
                    現在、導入店舗様の声を収集中です。
                  </p>
                </CardContent>
              </Card>
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S7. 料金プラン
      ────────────────────────────────────── */}
      <section id="plans" className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              料金プラン
            </h2>
            <p className="text-pretty mt-2 text-center text-sm text-muted-foreground">
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
                2026年9月まで、すべての機能が無料！
              </p>
              <p className="text-pretty mt-1 text-sm text-muted-foreground">
                スタンダード・プレミアムプランの
                <br className="sm:hidden" />
                機能もすべてお試しいただけます。
                <br />
                無料期間終了後も、
                <br className="sm:hidden" />
                フリープランは永久無料です。
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
                    {plan.note && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {plan.note}
                      </p>
                    )}
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
              <div className="mt-6">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-2 border-border/30">
                      <th className="py-2 pr-2 text-left font-medium text-muted-foreground sm:py-3 sm:pr-4">
                        機能
                      </th>
                      <th className="px-1.5 py-2 text-center font-semibold sm:px-4 sm:py-3">
                        フリー
                      </th>
                      <th className="px-1.5 py-2 text-center font-semibold text-primary sm:px-4 sm:py-3">
                        スタンダード
                      </th>
                      <th className="px-1.5 py-2 text-center font-semibold sm:px-4 sm:py-3">
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
                        <td className="py-2 pr-2 font-medium sm:py-3 sm:pr-4">
                          {row.feature}
                        </td>
                        {(["free", "standard", "premium"] as const).map(
                          (plan) => (
                            <td key={plan} className="px-1.5 py-2 text-center sm:px-4 sm:py-3">
                              {typeof row[plan] === "boolean" ? (
                                row[plan] ? (
                                  <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )
                              ) : (
                                <span className="text-xs font-medium sm:text-sm">
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
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              今日から、
              <br className="sm:hidden" />
              あなたのストーリーを
              <br className="sm:hidden" />
              届けよう。
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 space-y-0">
            {TIMELINE.map((item, index) => (
              <ScrollFadeIn key={item.step} delay={index * 80} direction="left">
                <div className="relative flex gap-3 pb-6 last:pb-0 sm:gap-4 sm:pb-8">
                  {/* タイムラインの線 */}
                  {index < TIMELINE.length - 1 && (
                    <div className="absolute left-[13px] top-7 h-full w-px bg-primary/20 sm:left-[15px] sm:top-8" />
                  )}
                  {/* ドット */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground sm:h-8 sm:w-8 sm:text-xs">
                    {index + 1}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{item.step}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        {item.time}
                      </Badge>
                    </div>
                    <p className="text-pretty mt-1.5 text-sm leading-relaxed text-muted-foreground">
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
            <h2 className="text-balance mt-6 font-heading text-2xl font-bold leading-tight md:text-4xl">
              あなたの想いを、
              <br />
              待っている人がいます。
            </h2>
            <p className="text-balance mx-auto mt-4 max-w-md text-sm leading-relaxed opacity-90 md:text-base">
              30分のインタビューから、
              <br className="sm:hidden" />
              新しい出会いが始まります。初期費用0円。
            </p>

            <Button
              size="lg"
              variant="secondary"
              className="mt-8 rounded-full px-10 text-base shadow-lg"
              asChild
            >
              <Link href="/apply-shop-owner">
                すぐに始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            {/* 信頼バッジ */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs opacity-80">
              {["初期費用0円", "いつでも解約OK"].map(
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
