import { Skeleton } from "@/components/ui/skeleton"

export function CurrentIssueSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-6">
      {/* Issue header */}
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-44" />
      </div>

      <div className="border-t border-border/60" />

      {/* Section header */}
      <Skeleton className="h-4 w-36" />

      {/* Article items */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="space-y-2.5 py-4 border-b border-border/30 last:border-0"
        >
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}

      {/* Second section header */}
      <div className="pt-2 space-y-4">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2.5 py-4 border-b border-border/30 last:border-0"
          >
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
