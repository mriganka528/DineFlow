import { Skeleton } from "@/components/ui/skeleton"

export default function InventoryLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4 rounded" />
            </div>
            <Skeleton className="mt-3 h-9 w-16" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        ))}
      </div>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg md:w-56" />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/60 px-6 py-3">
            <div className="grid min-w-[760px] grid-cols-[1.2fr_1fr_0.7fr_1.1fr_0.8fr] gap-6">
              {["Name", "Category", "Price", "Availability", "Actions"].map((label) => (
                <Skeleton key={label} className="h-3 w-20" />
              ))}
            </div>
          </div>

          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid min-w-[760px] grid-cols-[1.2fr_1fr_0.7fr_1.1fr_0.8fr] gap-6 px-6 py-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-7 w-28 rounded-lg" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-44 rounded-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
