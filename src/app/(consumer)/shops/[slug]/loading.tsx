import { Skeleton } from "@/components/ui/skeleton";

export default function ShopDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* パンくず */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* カバー */}
      <Skeleton className="h-48 w-full md:h-64" />

      {/* アクションバー */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      {/* タブ */}
      <div className="px-4 py-4">
        <Skeleton className="h-10 w-full rounded-md" />

        {/* ストーリー本文 */}
        <div className="mt-6 space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* 共感タップ */}
        <div className="mt-8 rounded-lg border p-4">
          <Skeleton className="mx-auto h-4 w-48" />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
