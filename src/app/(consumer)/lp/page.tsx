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
  Star,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "@/components/lp/hero-section";
import { ScrollFadeIn } from "@/components/lp/scroll-fade-in";
import { getPublishedShops } from "@/lib/queries/shops";

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

/* ----- UGC「推し声」仮データ ----- */
const OSHI_VOICES = [
  {
    name: "ゆうこ",
    shop: "炭火焼き鳥 とり源",
    comment: "ストーリーを読んで、店主のこだわりに感動。通い始めたらもう止まらない！",
    months: 5,
  },
  {
    name: "たくみ",
    shop: "手打ち蕎麦 あさひ",
    comment: "蕎麦粉へのこだわりを知ったら、味が全然違って感じた。毎週通ってます。",
    months: 3,
  },
  {
    name: "まり",
    shop: "ナチュラルワイン食堂 hinata",
    comment: "評価サイトにはない小さなお店。ストーリーで出会えてよかった。",
    months: 8,
  },
  {
    name: "けんた",
    shop: "らーめん一心",
    comment: "スープを仕込む朝4時の話を読んで、もうここ以外考えられなくなった。",
    months: 2,
  },
  {
    name: "あいり",
    shop: "創作フレンチ Lumière",
    comment: "シェフの修行時代の話に共感して推し店に。常連として認識してもらえるの嬉しい。",
    months: 6,
  },
];

/* ----- Before/After データ ----- */
const BEFORE_AFTER = [
  {
    before: "いつもの検索、いつものチェーン",
    after: "路地裏で見つけた、私だけの隠れ家",
  },
  {
    before: "評価の高い店に行くけど、なんか物足りない",
    after: "店主の想いを知って食べる一皿は、味が違う",
  },
  {
    before: "外食は\"消費\"だった",
    after: "推し店に通うことが、\"応援\"になった",
  },
];

export default async function ConsumerLpPage() {
  /* 公開済み店舗を取得（ストーリー体験セクション用） */
  const shops = await getPublishedShops();
  const shopsWithStory = shops
    .filter((s) => s.stories.length > 0)
    .slice(0, 3);

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
          S2. 共感 — 「あるある」問題提起
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <ScrollFadeIn>
            <h2 className="font-heading text-2xl font-bold md:text-3xl">
              こんな経験、ありませんか？
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Search,
                text: "評価サイトで3.5以上を探すけど、結局ハズレだった",
              },
              {
                icon: Smartphone,
                text: "SNSで映えるお店に行ったけど、なんか違った",
              },
              {
                icon: HelpCircle,
                text: "本当に自分に合うお店って、どうやって見つけるの？",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 120} direction="up">
                <Card className="h-full border-border/40 bg-card shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-sm leading-relaxed text-foreground md:text-base">
                      {item.text}
                    </p>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>

          <ScrollFadeIn delay={400}>
            <p className="mt-10 text-lg font-medium text-foreground md:text-xl">
              大切なのは、点数じゃなく
              <span className="text-primary">&ldquo;共感&rdquo;</span>。
            </p>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S3. ソリューション — オシドリとは
      ────────────────────────────────────── */}
      <section className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollFadeIn>
            <h2 className="font-heading text-2xl font-bold md:text-3xl">
              オシドリは、
              <span className="text-primary">&ldquo;想い&rdquo;</span>
              でお店と出会う場所。
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: "ストーリーで知る",
                desc: "店主のこだわりや想いを読んで、共感できるお店を見つける",
              },
              {
                icon: Heart,
                title: "推して応援する",
                desc: "気に入ったお店を「推し店」に。あなたの応援が届く",
              },
              {
                icon: Handshake,
                title: "つながりが深まる",
                desc: "通うほどに店主との距離が縮まり、特別な常連に",
              },
            ].map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 120} direction="up">
                <Card className="h-full border-none bg-white shadow-md">
                  <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-bold">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
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
          S4. ストーリー体験 — 実際のお店紹介
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              こだわりの向こう側に、物語がある。
            </h2>
          </ScrollFadeIn>

          {shopsWithStory.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {shopsWithStory.map((shop, i) => {
                const story = shop.stories[0];
                const displayTags = (shop.display_tags ?? []).slice(0, 2);
                return (
                  <ScrollFadeIn key={shop.id} delay={i * 150} direction="up">
                    <Link href={`/shops/${shop.slug}`} className="group block">
                      <Card className="h-full overflow-hidden border-border/30 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                        {/* 画像 */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                          {shop.image_url ? (
                            <img
                              src={shop.image_url}
                              alt={shop.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-4xl">
                              🍽️
                            </div>
                          )}
                          {/* タグバッジ */}
                          {displayTags.length > 0 && (
                            <div className="absolute bottom-2 left-2 flex gap-1">
                              {displayTags.map((tag, ti) => (
                                <Badge
                                  key={ti}
                                  variant="secondary"
                                  className="bg-white/90 text-xs backdrop-blur-sm"
                                >
                                  {tag.icon} {tag.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">
                            {shop.area ?? "エリア未設定"}
                          </p>
                          <h3 className="mt-1 font-heading text-base font-bold">
                            {shop.name}
                          </h3>
                          {story?.hook_sentence && (
                            <p className="mt-2 text-sm italic leading-relaxed text-primary">
                              &ldquo;{story.hook_sentence}&rdquo;
                            </p>
                          )}
                          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                            ストーリーを読む
                            <ArrowRight className="h-3 w-3" />
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  </ScrollFadeIn>
                );
              })}
            </div>
          ) : (
            /* 店舗データがない場合のフォールバック */
            <ScrollFadeIn delay={200}>
              <div className="mt-10 rounded-2xl bg-warm p-8 text-center">
                <p className="text-lg font-medium text-foreground">
                  続々とこだわりのお店が参加中。
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  あなたの街の推し店を探してみましょう。
                </p>
                <Button className="mt-6" asChild>
                  <Link href="/home">
                    お店を探す
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollFadeIn>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────
          S5. UGC風 — 「推し声」セクション
      ────────────────────────────────────── */}
      <section className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              みんなの&ldquo;推し声&rdquo;
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OSHI_VOICES.map((voice, i) => (
              <ScrollFadeIn key={i} delay={i * 100} direction="up">
                <Card className="h-full border-none bg-white shadow-sm">
                  <CardContent className="p-5">
                    <Quote className="h-5 w-5 text-primary/40" />
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      {voice.comment}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {voice.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{voice.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {voice.shop}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-auto shrink-0 text-xs"
                      >
                        🏅 推し歴{voice.months}ヶ月
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S6. 使い方 — シンプル3ステップ
      ────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              かんたん3ステップで、推し店探し
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Search,
                title: "気分で探す",
                desc: "今の気分やシーンからお店を見つける",
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
                  {/* ステップ番号 */}
                  <span className="absolute -top-2 right-4 font-heading text-6xl font-bold text-primary/10 md:right-0">
                    {item.step}
                  </span>
                  <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <item.icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-bold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S7. Before/After — 生活変化の訴求
      ────────────────────────────────────── */}
      <section className="bg-warm px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <ScrollFadeIn>
            <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
              &ldquo;推し店&rdquo;があると、
              <br className="sm:hidden" />
              毎日がちょっと変わる。
            </h2>
          </ScrollFadeIn>

          <div className="mt-10 flex flex-col gap-5">
            {BEFORE_AFTER.map((item, i) => (
              <ScrollFadeIn key={i} delay={i * 120} direction="left">
                <div className="flex flex-col overflow-hidden rounded-2xl border border-border/30 bg-white shadow-sm md:flex-row">
                  {/* Before */}
                  <div className="flex flex-1 items-center gap-3 bg-muted/30 px-6 py-5">
                    <span className="shrink-0 text-2xl text-muted-foreground/50">
                      ▸
                    </span>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Before
                      </span>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.before}
                      </p>
                    </div>
                  </div>
                  {/* 矢印 */}
                  <div className="flex items-center justify-center bg-white px-4 py-2 md:py-0">
                    <ArrowRight className="h-5 w-5 rotate-90 text-primary md:rotate-0" />
                  </div>
                  {/* After */}
                  <div className="flex flex-1 items-center gap-3 px-6 py-5">
                    <span className="shrink-0 text-2xl text-primary">★</span>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        After
                      </span>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {item.after}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollFadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────
          S8. CTA — 最終アクション
      ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 px-4 py-16 text-primary-foreground md:py-24">
        {/* 装飾 */}
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <ScrollFadeIn>
            <Sparkles className="mx-auto h-10 w-10" />
            <h2 className="mt-6 font-heading text-2xl font-bold leading-tight md:text-4xl">
              あなたの&ldquo;推し店&rdquo;を、
              <br />
              探しに行こう。
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed opacity-90 md:text-base">
              登録は無料。こだわりのお店との新しい出会いが、ここから始まります。
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
            <p className="mt-4 text-xs opacity-70">
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
