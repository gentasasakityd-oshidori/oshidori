import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <ShieldAlert className="h-16 w-16 text-muted-foreground" />
      <h1 className="mt-6 text-2xl font-bold">アクセス権限がありません</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        このページにアクセスするには適切な権限が必要です。
        店舗オーナーの方は、店舗権限の申請をお願いします。
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/home">ホームに戻る</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/apply-shop-owner">店舗権限を申請する</Link>
        </Button>
      </div>
    </div>
  );
}
