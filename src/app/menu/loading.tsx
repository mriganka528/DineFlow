import { Skeleton } from "@/components/ui/skeleton";

export default function MenuLoading() {
  return (
    <main className="min-h-screen bg-linear-to-b from-amber-50/60 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Hero */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-14 w-3/4" />
            <Skeleton className="h-5 w-full max-w-lg" />
            <div className="flex flex-wrap gap-3 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-32 rounded-full" />
              ))}
            </div>
          </div>
          <div className="grid min-h-88 grid-cols-3 grid-rows-2 gap-3">
            <Skeleton className="col-span-2 row-span-2 rounded-2xl" />
            <Skeleton className="rounded-2xl" />
            <Skeleton className="rounded-2xl" />
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl sm:w-44" />
          <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
        </div>

        {/* Food grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/6">
              <Skeleton className="aspect-16/10 w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-9 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
