import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-warm-light">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* ブランド */}
          <div>
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="オシドリ"
                width={90}
                height={25}
                className="h-6 w-auto"
              />
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              飲食人の&quot;好き&quot;と&quot;こだわり&quot;が、
              <br />
              お客さんの共感を通じて価値になる。
            </p>
          </div>

          {/* リンク */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">サービス</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/explore" className="hover:text-foreground">
                  お店を探す
                </Link>
              </li>
              <li>
                <Link href="/stories" className="hover:text-foreground">
                  ストーリー
                </Link>
              </li>
              <li>
                <Link href="/for-shops" className="hover:text-foreground">
                  飲食店オーナーの方へ
                </Link>
              </li>
            </ul>
          </div>

          {/* 会社情報 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">その他</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground">
                  オシドリについて
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  プライバシーポリシー
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} オシドリ All rights reserved.
        </div>
      </div>
    </footer>
  );
}
