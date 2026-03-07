import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* 検索バー */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
      </div>

      {/* エリアフィルター */}
      <div className="mt-4 flex gap-2 overflow-hidden md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 shrink-0 rounded-full" />
        ))}
      </div>

      {/* 結果件数 */}
      <Skeleton className="mt-4 h-4 w-40" />

      {/* カード一覧 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border">
            <Skeleton className="h-36 w-full" />
            <div className="p-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-5 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/3" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-2/3" />
              <div className="mt-3 flex gap-4">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
