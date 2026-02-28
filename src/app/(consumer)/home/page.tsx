import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPublishedShops } from "@/lib/queries";
import { AREAS } from "@/lib/constants";
import { SearchBar } from "@/components/search-bar";

export default async function HomePage() {
  const shops = await getPublishedShops();

  // エリア別の店舗数を集計
  const areaCounts = AREAS.map((area) => ({
    name: area,
    count: shops.filter((s) => s.area === area).length,
  })).filter((a) => a.count > 0);

  return (
    <>
      {/* ヒーロー（軽量版） */}
      <section className="bg-warm px-4 py-8 md:py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold leading-tight md:text-3xl">
            <span className="text-primary">推しの飲食店</span>と出会う。
            <span className="text-primary">こだわり</span>で、つながる。
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            点数や口コミではわからない、店主の想いとこだわり。あなただけの推し店を見つけよう。
          </p>
          {/* 検索エリア */}
          <div className="mt-5">
            <SearchBar />
          </div>
          {/* エリアタグ（横スクロール） */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {areaCounts.map((area) => (
              <Link
                key={area.name}
                href={`/explore?area=${area.name}`}
                className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-warm"
              >
                {area.name}
                <span className="ml-1 text-muted-foreground">
                  {area.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* あなたにおすすめのストーリー（メインコンテンツ） */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">あなたにおすすめ</h2>
            <Link
              href="/explore"
              className="text-sm text-primary hover:underline"
            >
              すべて見る
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.slice(0, 3).map((shop) => {
              const mainStory = shop.stories[0];
              if (!mainStory) return null;
              return (
                <Card
                  key={shop.id}
                  className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="h-40 bg-gradient-to-br from-warm to-secondary" />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {shop.area}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {shop.category}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-semibold leading-snug">
                      <Link
                        href={`/shops/${shop.slug}`}
                        className="hover:text-primary"
                      >
                        {mainStory.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shop.name} / {shop.owner_name}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {mainStory.summary}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {shop._count.oshi} 推し
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {shop._count.empathy} 共感
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 注目のストーリー */}
      <section className="bg-warm-light px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">注目のストーリー</h2>
            <Link
              href="/stories"
              className="text-sm text-primary hover:underline"
            >
              すべて見る
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.slice(3, 6).map((shop) => {
              const mainStory = shop.stories[0];
              if (!mainStory) return null;
              return (
                <Card
                  key={shop.id}
                  className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="h-40 bg-gradient-to-br from-warm to-secondary" />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {shop.area}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {shop.category}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-semibold leading-snug">
                      <Link
                        href={`/shops/${shop.slug}`}
                        className="hover:text-primary"
                      >
                        {mainStory.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shop.name} / {shop.owner_name}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {mainStory.summary}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {shop._count.oshi} 推し
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {shop._count.empathy} 共感
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* オシドリとは（コンセプト — 下部に移動） */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-lg font-bold text-muted-foreground">
            オシドリとは？
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold">店主の想いを物語に</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                店主との対話から、お店の魅力をストーリーに
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold">共感で出会う</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点数ではなく、こだわりへの共感でお店を選ぶ
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold">推して応援</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                好きなお店を「推し店」に。応援が届く
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 飲食店オーナーCTA */}
      <section className="bg-primary px-4 py-12 text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">飲食店オーナーの方へ</h2>
          <p className="mt-3 text-sm opacity-90">
            あなたの&quot;こだわり&quot;を引き出し、プロ品質のストーリーに。
            <br />
            発信が苦手でも大丈夫。1時間の対話だけで、お店の魅力が伝わります。
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link href="/for-shops">無料で始める</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
