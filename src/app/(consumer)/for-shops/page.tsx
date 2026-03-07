import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Heart,
  TrendingUp,
  MessageSquare,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  Mic,
  Wand2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "飲食店オーナー様へ",
  description:
    "AIインタビューであなたのお店の想いをストーリーに。発信が苦手でも大丈夫。30分の対話だけで、こだわりが伝わるプロ品質のコンテンツが完成します。無料プランあり。",
  openGraph: {
    title: "飲食店オーナー様へ | オシドリ",
    description:
      "AIインタビューであなたのお店の想いをストーリーに。発信が苦手でも大丈夫。30分の対話だけで、こだわりが伝わるプロ品質のコンテンツが完成します。",
    url: "https://oshidori.vercel.app/for-shops",
    type: "website",
  },
  alternates: {
    canonical: "https://oshidori.vercel.app/for-shops",
  },
};

const STEPS = [
  {
    number: "01",
    icon: Mic,
    title: "AIと30分対話",
    description:
      "AIがインタビュアーとなり、あなたのお店の想い・こだわり・歩みを丁寧に引き出します。話すのが苦手でも大丈夫。質問に答えるだけでOKです。",
  },
  {
    number: "02",
    icon: Wand2,
    title: "ストーリー自動生成",
    description:
      "対話の内容からAIがプロ品質のストーリーを自動生成。お店の魅力が伝わる文章、SNS用の要約まで一括で作成されます。",
  },
  {
    number: "03",
    icon: Users,
    title: "ファンが集まる",
    description:
      "ストーリーを読んだユーザーが「共感タップ」や「推し登録」で推してくれます。点数ではなく想いでつながる、新しいファンが生まれます。",
  },
];

const PLANS = [
  {
    name: "フリー",
    price: "0",
    priceUnit: "円",
    description: "まずは試してみたい方に",
    features: [
      "AIインタビュー 1回",
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
      "AIインタビュー 無制限",
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

const TIMELINE = [
  {
    step: "お申し込み",
    time: "5分",
    description: "メールアドレスで簡単登録。クレジットカード不要。",
  },
  {
    step: "AIインタビュー",
    time: "約30分",
    description:
      "AIがあなたのお店の想いを引き出します。スマホからでもOK。",
  },
  {
    step: "ストーリー確認・公開",
    time: "翌日",
    description:
      "生成されたストーリーを確認・編集して公開。すぐにユーザーに届きます。",
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

export default function ForShopsPage() {
  return (
    <>
      {/* ヒーローセクション */}
      <section className="bg-warm px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4 text-sm">
            飲食店オーナー様向け
          </Badge>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            あなたの
            <span className="text-primary">&quot;こだわり&quot;</span>が、
            <br />
            お客さんの
            <span className="text-primary">&quot;推し&quot;</span>になる。
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            AIがあなたのお店の想いを引き出し、プロ品質のストーリーに変換。
            <br className="hidden sm:block" />
            点数評価ではなく、&quot;共感&quot;で新しいファンと出会えます。
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/apply-shop-owner">
                無料で始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#plans">料金プランを見る</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 課題提起 */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-bold">
            こんなお悩みはありませんか？
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "SNSの発信が苦手で、お店の魅力を伝えきれていない",
              "口コミサイトの点数に左右されてしまう",
              "こだわりを持って料理しているのに、なかなか伝わらない",
              "新規のお客さんがなかなか増えない",
            ].map((problem) => (
              <Card key={problem} className="text-left">
                <CardContent className="flex items-start gap-3 p-4">
                  <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <p className="text-sm">{problem}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            オシドリなら、<strong className="text-foreground">30分の対話だけ</strong>で、
            お店の魅力が伝わるストーリーが完成します。
          </p>
        </div>
      </section>

      {/* 3ステップ */}
      <section className="bg-warm-light px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-bold">
            <Sparkles className="mb-1 inline h-5 w-5 text-primary" />{" "}
            かんたん3ステップ
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <Card
                key={step.number}
                className="relative overflow-hidden border-primary/20"
              >
                <div className="absolute right-3 top-3 text-4xl font-bold text-primary/10">
                  {step.number}
                </div>
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* オシドリの価値提案 */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-bold">
            オシドリが選ばれる理由
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AIがストーリーを作る</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  文章を書く必要はありません。AIとの対話だけで、お店の魅力を言語化したストーリーが完成します。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">共感で集客</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  点数評価ではなく、こだわりへの共感でお客さんとつながります。本当にお店を好きになってくれるファンが集まります。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">感情データで改善</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  どの想いに共感が集まっているかを可視化。お客さんの心に響くポイントがわかります。
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">SNS素材も自動生成</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  ストーリーからSNS投稿用の短いテキストも自動で作成。そのまま投稿できます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 料金プラン */}
      <section id="plans" className="bg-warm-light px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-bold">料金プラン</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            まずは無料プランからお試しいただけます
          </p>
          {/* 無料期間バナー */}
          <div className="mx-auto mt-6 max-w-lg rounded-xl border-2 border-primary/30 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4 text-center">
            <p className="text-lg font-bold text-primary">
              🎉 リリース記念キャンペーン
            </p>
            <p className="mt-1 text-sm font-semibold text-[#2C3E50]">
              2026年12月まで、すべての機能が無料！
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              スタンダード・プレミアムプランの機能もすべてお試しいただけます。
              無料期間終了後も、フリープランは永久無料です。
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden ${
                  plan.highlighted
                    ? "border-2 border-primary shadow-lg"
                    : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="bg-primary px-4 py-1 text-center text-xs font-medium text-primary-foreground">
                    おすすめ
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
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
                  <ul className="space-y-2">
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
            ))}
          </div>
        </div>
      </section>

      {/* 機能比較表 */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-bold">機能比較</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            活用度合い・利用目的に合わせてプランをお選びください
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 pr-4 text-left font-medium text-muted-foreground">機能</th>
                  <th className="px-4 py-3 text-center font-semibold">フリー</th>
                  <th className="px-4 py-3 text-center font-semibold text-primary">スタンダード</th>
                  <th className="px-4 py-3 text-center font-semibold">プレミアム</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AIインタビュー", free: "1回", standard: "無制限", premium: "無制限" },
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
                ].map((row) => (
                  <tr key={row.feature} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{row.feature}</td>
                    {(["free", "standard", "premium"] as const).map((plan) => (
                      <td key={plan} className="px-4 py-3 text-center">
                        {typeof row[plan] === "boolean" ? (
                          row[plan] ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-sm font-medium">{row[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 導入の流れ（タイムライン） */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-xl font-bold">導入の流れ</h2>
          <div className="mt-8 space-y-0">
            {TIMELINE.map((item, index) => (
              <div key={item.step} className="relative flex gap-4 pb-8 last:pb-0">
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
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 py-12 text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <Star className="mx-auto h-8 w-8" />
          <h2 className="mt-4 text-2xl font-bold">
            あなたのお店のストーリーを、
            <br />
            今日から届けませんか？
          </h2>
          <p className="mt-3 text-sm opacity-90">
            登録は無料。クレジットカードも不要です。
            <br />
            まずはAIインタビューを体験してみてください。
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-6"
            asChild
          >
            <Link href="/apply-shop-owner">
              無料で始める
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
