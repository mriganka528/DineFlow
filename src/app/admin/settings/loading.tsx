import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="space-y-5">
          <SettingsPanelSkeleton rows={5} />
          <SettingsPanelSkeleton rows={2} />
          <SettingsPanelSkeleton rows={5} />
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <Skeleton className="mb-4 size-12 rounded-lg" />
              <Skeleton className="h-6 w-44" />
              <Skeleton className="mt-2 h-4 w-56" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>

          <SettingsPanelSkeleton rows={3} />
        </aside>
      </div>
    </div>
  )
}

function SettingsPanelSkeleton({ rows }: { rows: number }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={index === rows - 1 && rows % 2 === 1 ? "space-y-2 md:col-span-2" : "space-y-2"}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  )
}
