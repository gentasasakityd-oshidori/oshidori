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
  CreditCard,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HeroSection } from "@/components/lp/hero-section";
import { ScrollFadeIn } from "@/components/lp/scroll-fade-in";
import { CounterAnimation } from "@/components/lp/counter-animation";

export const metadata: Metadata = {
  title: "飲食店オーナー様へ | オシドリ",
  description:
    "あなたのこだわりは、きっと誰かの推しになる。こだわりを言葉にするだけで、あなたのファンが増えていく。広告費も、SNS更新も、いらない。",
  openGraph: {
    title: "飲食店オーナー様へ | オシドリ",
    description:
      "こだわりを言葉にするだけで、あなたのファンが増えていく。広告費も、SNS更新も、いらない。",
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
    cta: "すぐに始める",
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
    cta: "すぐに始める",
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


/* ----- 導入事例（仮データ） ----- */
const TESTIMONIALS = [
  {
    name: "田中 誠一",
    shopName: "炭火焼き鳥 とり源",
    area: "渋谷区",
    image: "/images/lp/shop-torigen.webp",
    comment:
      "「読んで来ました」と言ってくれるお客さんが増えて本当に嬉しいです。",
  },
  {
    name: "佐藤 恵子",
    shopName: "手打ち蕎麦 あさひ",
    area: "世田谷区",
    image: "/images/lp/shop-asahi.webp",
    comment:
      "常連さんが友達を連れてきてくれるようになりました。",
  },
  {
    name: "山田 健太郎",
    shopName: "ナチュラルワイン食堂 hinata",
    area: "目黒区",
    image: "/images/lp/shop-hinata.webp",
    comment:
      "想いに共感してくれるお客さんが来るから、料理にもっと集中できます。",
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
            広告費も、SNS更新も、いらない。
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
          <Badge className="bg-white/95 px-3 py-1.5 text-xs font-bold text-primary shadow-lg backdrop-blur-sm">
            30分で登録完了
          </Badge>
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
                { icon: Smartphone, text: "SNSの更新が追いつかない" },
                { icon: Star, text: "点数だけで判断されてしまう" },
                { icon: MessageSquare, text: "こだわりが、なかなか伝わらない" },
                { icon: RefreshCw, text: "一見さんが常連になってくれない" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-4 py-2.5 shadow-sm"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-primary/60" />
                  <p className="text-sm text-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn delay={500}>
            <p className="text-balance mt-8 text-base font-medium md:text-lg">
              オシドリは、
              <br className="sm:hidden" />
              <span className="text-primary">常連さん候補と出会い、</span>
              <br className="sm:hidden" />
              <span className="text-primary">常連さんとの関係を紡ぎ続ける</span>
              <br className="sm:hidden" />
              場所です。
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
                title: "想いを話す",
                time: "30分",
                desc: "質問に答えるだけ。あなたのこだわりを引き出します。",
                image: "/images/lp/shop-step-talk.webp",
                imageAlt: "店主がインタビューで想いを語る様子",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "ストーリーになる",
                time: "自動",
                desc: "あなたの言葉が、魅力が伝わるストーリーに自動変換。",
                image: "/images/lp/shop-step-story.webp",
                imageAlt: "店主の言葉がストーリーコンテンツになる様子",
              },
              {
                step: "03",
                icon: Heart,
                title: "共感が集まる",
                time: "翌日〜",
                desc: "想いに共感したお客さんが推し登録。ファンが生まれます。",
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
                desc: "SNS更新もライティングも不要。30分話すだけでストーリーが完成。",
              },
              {
                icon: Heart,
                title: "想いで選ばれる",
                desc: "点数ではなく、あなたのこだわりに共感した人が来店する。",
              },
              {
                icon: Users,
                title: "常連が増える",
                desc: "推し登録したお客さんは、何度も通ってくれるファンに。",
              },
              {
                icon: Shield,
                title: "広告費ゼロ",
                desc: "掲載料も広告費もなし。共感が自然に口コミとして広がる。",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 100} direction="up">
                <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-card p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{item.title}</h3>
                    <p className="text-pretty mt-0.5 text-xs leading-relaxed text-muted-foreground">
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
                { value: 120, suffix: "回", label: "共感タップ\n月平均" },
                { value: 73, suffix: "%", label: "推し登録率" },
                { value: 45, suffix: "%", label: "リピーター率\n向上" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white p-3 text-center shadow-sm"
                >
                  <p className="font-heading text-2xl font-bold text-primary md:text-3xl">
                    <CounterAnimation
                      target={item.value}
                      suffix={item.suffix}
                      separator={false}
                    />
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[10px] font-medium text-muted-foreground md:text-xs">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn delay={400}>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
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
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              始めた店主の声
            </h2>
          </ScrollFadeIn>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <ScrollFadeIn key={i} delay={i * 150} direction="up">
                <Card className="h-full overflow-hidden border-border/30 shadow-sm">
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={t.image}
                      alt={`${t.shopName}の店内の様子`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm leading-relaxed text-foreground">
                      &ldquo;{t.comment}&rdquo;
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">
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
                2026年12月まで、すべての機能が無料！
              </p>
              <p className="text-pretty mt-1 text-xs text-muted-foreground">
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
                    <p className="text-pretty mt-1 text-sm text-muted-foreground">
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
              30分の対話から、
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
