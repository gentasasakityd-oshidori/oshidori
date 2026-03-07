import { Skeleton } from "@/components/ui/skeleton";

export default function StoriesLoading() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <Skeleton className="mx-auto h-7 w-32" />
          <Skeleton className="mx-auto mt-2 h-4 w-64" />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
                <Skeleton className="mt-1 h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-2/3" />
                <div className="mt-3 flex gap-4">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
