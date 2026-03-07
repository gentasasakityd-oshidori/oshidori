import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <>
      {/* ヒーロー */}
      <section className="bg-warm px-4 py-8 md:py-10">
        <div className="mx-auto max-w-4xl">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-5 h-10 w-full rounded-md" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-16 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      {/* おすすめセクション */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border">
                <Skeleton className="h-40 w-full" />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-5 w-3/4" />
                  <Skeleton className="mt-1 h-3 w-1/2" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-1 h-4 w-2/3" />
                  <div className="mt-3 flex gap-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
