import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-warm/30">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <span className="text-4xl">🍽</span>
      </div>
      <h1 className="text-2xl font-bold text-[#2C3E50]">ページが見つかりません</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        お探しのページは移動または削除された可能性があります
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild className="bg-[#E06A4E] hover:bg-[#d0593d]">
          <Link href="/home">ホームへ戻る</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/explore" className="gap-1.5">
            <Compass className="h-4 w-4" />
            お店を探す
          </Link>
        </Button>
      </div>
    </div>
  );
}
