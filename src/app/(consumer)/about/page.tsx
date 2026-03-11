import Link from "next/link";
import { ArrowRight, Heart, Sparkles, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function AboutPage() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-balance text-3xl font-bold text-primary">オシドリについて</h1>
          <p className="text-pretty mt-4 text-base text-muted-foreground">
            飲食人の&quot;好き&quot;と&quot;こだわり&quot;が、
            お客さんの共感を通じて価値になる世界を目指しています。
          </p>
        </div>

        <Separator className="my-10" />

        <div className="space-y-10">
          <div>
            <h2 className="text-balance text-xl font-bold">私たちのミッション</h2>
            <p className="text-pretty mt-3 text-sm leading-relaxed text-foreground/90">
              食べログやGoogle口コミの「点数」は便利ですが、
              それだけではお店の本当の魅力は伝わりません。
              毎朝4時に起きて仕込みをする理由、食材を選ぶこだわり、
              お客さんへの想い——それらの「ストーリー」こそが、
              飲食店の一番の価値だと私たちは考えています。
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              オシドリは、飲食店オーナーの想いを丁寧に引き出し、
              プロ品質のストーリーとして届けるプラットフォームです。
              点数評価ではなく「共感」で、お店とお客さんをつなぎます。
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border p-6">
              <Sparkles className="h-8 w-8 text-primary" />
              <h3 className="text-balance mt-3 font-semibold">想いをストーリーに</h3>
              <p className="text-pretty mt-2 text-sm text-muted-foreground">
                発信が苦手でも大丈夫。30分の対話だけで、
                お店の魅力が伝わるストーリーが完成します。
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <Heart className="h-8 w-8 text-primary" />
              <h3 className="text-balance mt-3 font-semibold">共感エコノミー</h3>
              <p className="text-pretty mt-2 text-sm text-muted-foreground">
                「おいしい」だけでなく「この想いに共感した」という
                新しい形のつながりを生み出します。
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <MessageCircle className="h-8 w-8 text-primary" />
              <h3 className="text-balance mt-3 font-semibold">推し文化</h3>
              <p className="text-pretty mt-2 text-sm text-muted-foreground">
                推し登録して、好きなお店を推す。
                共感でつながる、飲食店を推す文化を作ります。
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <Users className="h-8 w-8 text-primary" />
              <h3 className="text-balance mt-3 font-semibold">飲食業界の課題解決</h3>
              <p className="text-pretty mt-2 text-sm text-muted-foreground">
                廃業率の高い飲食業界において、
                お店の本質的な価値を可視化し、持続可能な経営を支援します。
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-pretty text-sm text-muted-foreground">
              オシドリは、飲食店と消費者の新しい関係を作るプラットフォームです。
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/explore">
                  お店を探す
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/for-shops">飲食店オーナーの方はこちら</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
