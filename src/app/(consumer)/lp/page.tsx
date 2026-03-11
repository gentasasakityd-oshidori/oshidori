import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Smartphone,
  HelpCircle,
  BookOpen,
  Heart,
  Handshake,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeroSection } from "@/components/lp/hero-section";
import { ScrollFadeIn } from "@/components/lp/scroll-fade-in";

export const metadata: Metadata = {
  title: "推し店を見つけよう | オシドリ",
  description:
    "点数じゃ、わからない。店主の想い、食材へのこだわり、一皿に込められた物語。あなただけの推し店が、きっと見つかる。オシドリは想いでお店と出会う場所です。",
  openGraph: {
    title: "推し店を見つけよう | オシドリ",
    description:
      "点数じゃ、わからない。店主の想い、食材へのこだわり、一皿に込められた物語。あなただけの推し店が、きっと見つかる。",
    url: "https://oshidori.vercel.app/lp",
    type: "website",
  },
  alternates: {
    canonical: "https://oshidori.vercel.app/lp",
  },
};

/* ----- Before/After データ ----- */
const BEFORE_AFTER = [
  {
    before: "いつもの検索、いつもの初めまして",
    after: "路地裏で見つけた、私だけの隠れ家",
  },
  {
    before: "評価の高い店に行くけど、自分の好みじゃないかも",
    after: "店主の想いを知って食べる一皿は、毎回感動がある",
  },
  {
    before: "外食は\"消費\"だった",
    after: "推し店に通うことが、\"応援\"になった",
  },
];

export default function ConsumerLpPage() {
  return (
    <>
      {/* ──────────────────────────────────────
          S1. ヒーロー — 感情フック
      ────────────────────────────────────── */}
      <HeroSection
        backgroundImage="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80"
        headline={
          <>
            点数じゃ、わからない。
          </>
        }
        subheadline={
          <>
            店主の想い、食材へのこだわり、一皿に込められた物語。
            <br className="hidden sm:block" />
            あなただけの&ldquo;推し店&rdquo;が、きっと見つかる。
          </>
        }
        actions={
          <Button
            size="lg"
            className="animate-pulse rounded-full px-8 text-base shadow-lg"
            asChild
          >
            <Link href="/home">
              推し店を探してみる
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* ──────────────────────────────────────
          S2. 共感 — 「あるある」問題提起（コンパクト版）
      ────────────────────────────────────── */}
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollFadeIn>
            <h2 className="text-balance font-heading text-2xl font-bold md:text-3xl">
              こんな経験、ありませんか？
            </h2>
          </ScrollFadeIn>

          <ScrollFadeIn delay={100}>
            <div className="mt-6 space-y-2">
              {[
                { icon: Search, text: "評価サイトで探すけど、通い続けるお店は見つからない" },
                { icon: Smartphone, text: "SNSで話題のお店に行ったけど、なんか違った" },
                { icon: HelpCircle, text: "本当に自分に合うお店って、どうやって見つけるの？" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border/30 bg-card px-4 py-2.5 text-left shadow-sm"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-primary/60" />
                  <p className="whitespace-nowrap text-base text-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn delay={300}>
            <p className="text-balance mt-6 text-lg font-medium text-foreground md:text-xl">
              大切にしたいのは、点数じゃなく
              <span className="text-primary">&ldquo;共感&rdquo;</span>。
            </p>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S3. ソリューション — オシドリとは
      ────────────────────────────────────── */}
      <section className="bg-warm px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollFadeIn>
            <h2 className="text-balance font-heading text-2xl font-bold md:text-3xl">
              オシドリは、
              <br className="sm:hidden" />
              <span className="text-primary">&ldquo;想い&rdquo;</span>
              でお店と出会い、
              <br className="sm:hidden" />
              関係を紡ぐ場所。
            </h2>
          </ScrollFadeIn>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: "ストーリーで知る",
                desc: "店主のこだわりや想いを読んで、共感できるお店を見つける",
                image: "/images/lp/feature-story.webp",
                imageAlt: "店主のストーリーを読んでいる様子",
              },
              {
                icon: Heart,
                title: "推して応援する",
                desc: "気に入ったお店を「推し店」に。あなたの応援が届く",
                image: "/images/lp/feature-oshi.webp",
                imageAlt: "お気に入りのお店を推し店登録する様子",
              },
              {
                icon: Handshake,
                title: "つながりが深まる",
                desc: "通うほどに店主との距離が縮まり、特別な常連に",
                image: "/images/lp/feature-connect.webp",
                imageAlt: "常連として店主とつながっている様子",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 120} direction="up">
                <Card className="h-full overflow-hidden border-none bg-white shadow-md">
                  <div className="aspect-[3/2] overflow-hidden bg-muted">
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-bold">
                      {item.title}
                    </h3>
                    <p className="text-pretty text-sm leading-snug text-muted-foreground">
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
          S4. ストーリー体験 — お店の魅力
      ────────────────────────────────────── */}
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              お店の裏側には、
              <br className="sm:hidden" />
              必ずストーリーがある。
            </h2>
          </ScrollFadeIn>

          <ScrollFadeIn delay={200}>
            <div className="mt-8 rounded-2xl bg-warm p-6 text-center md:p-8">
              <p className="text-base font-medium text-foreground md:text-lg">
                続々とこだわりのお店が参加中。
              </p>
              <p className="mt-2 text-base text-muted-foreground">
                店主の想いやこだわりが詰まったストーリーを読んで、
                <br className="hidden sm:block" />
                あなたの街の推し店を探してみましょう。
              </p>
              <Button className="mt-5" asChild>
                <Link href="/home">
                  お店を探す
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S5. 使い方 — シンプル3ステップ（コンパクト版）
      ────────────────────────────────────── */}
      <section className="bg-warm px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              かんたん3ステップで、
              <br className="sm:hidden" />
              推し店探し
            </h2>
          </ScrollFadeIn>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Search,
                title: "気分で探す",
                desc: "今の気分や食べたいメニューからお店を見つける",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "ストーリーを読む",
                desc: "店主の想いに触れて、ピンとくるお店に出会う",
              },
              {
                step: "03",
                icon: Heart,
                title: "推し店に登録",
                desc: "お気に入りを推して、お店との関係を育てる",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 150} direction="up">
                <div className="relative flex flex-col items-center text-center">
                  <span className="absolute -top-1 right-4 font-heading text-5xl font-bold text-primary/10 md:right-0 md:text-6xl">
                    {item.step}
                  </span>
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 md:h-16 md:w-16">
                    <item.icon className="h-7 w-7 text-primary md:h-8 md:w-8" />
                  </div>
                  <h3 className="mt-3 font-heading text-base font-bold md:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-base text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S6. Before/After — 生活変化の訴求（コンパクト版）
      ────────────────────────────────────── */}
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-balance text-center font-heading text-2xl font-bold md:text-3xl">
              &ldquo;推し店&rdquo;があると、
              <br className="sm:hidden" />
              毎日がちょっと幸せに。
            </h2>
          </ScrollFadeIn>

          <div className="mt-6 flex flex-col gap-2">
            {BEFORE_AFTER.map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 120} direction="left">
                <div className="grid grid-cols-[1fr_24px_1fr] items-stretch overflow-hidden rounded-lg border border-border/30 bg-white shadow-sm">
                  {/* Before */}
                  <div className="bg-muted/30 px-3 py-2.5">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Before
                    </span>
                    <p className="text-sm leading-snug text-muted-foreground">
                      {item.before}
                    </p>
                  </div>
                  {/* 矢印 */}
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {/* After */}
                  <div className="px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      After
                    </span>
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {item.after}
                    </p>
                  </div>
                </div>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S7. CTA — 最終アクション
      ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 px-4 py-16 text-primary-foreground md:py-24">
        {/* 装飾 */}
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <ScrollFadeIn>
            <Sparkles className="mx-auto h-10 w-10" />
            <h2 className="text-balance mt-6 font-heading text-2xl font-bold leading-tight md:text-4xl">
              あなたの&ldquo;推し店&rdquo;を、
              <br />
              探しに行こう。
            </h2>
            <p className="text-balance mx-auto mt-4 max-w-md text-base leading-relaxed opacity-90 md:text-lg">
              登録・月額費用は完全無料。こだわりのお店との
              <br className="sm:hidden" />
              新しい出会いが、ここから始まります。
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm opacity-60">
              ※ 各店のファンクラブ機能を利用する場合に、お店への会費支払いが生じる場合があります。
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 rounded-full px-10 text-base shadow-lg"
              asChild
            >
              <Link href="/login">
                無料で始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-4 text-sm opacity-70">
              <Link
                href="/for-shops"
                className="underline underline-offset-2 transition-opacity hover:opacity-100"
              >
                飲食店オーナーの方はこちら →
              </Link>
            </p>
          </ScrollFadeIn>
        </div>
      </section>
    </>
  );
}
