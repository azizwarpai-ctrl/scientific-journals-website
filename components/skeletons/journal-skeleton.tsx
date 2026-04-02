import { Skeleton } from "@/components/ui/skeleton"

/**
 * Single skeleton card matching the spotlight JournalCard layout.
 */
export function JournalCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md aspect-[3/4]">
      <Skeleton className="flex-[3] w-full rounded-none" />
      <div className="flex flex-[1] flex-col justify-between gap-2 px-4 py-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  )
}

/**
 * Grid of skeleton cards used on the journals list page.
 * Grid columns mirror the real card grid: 2 → 3 → 4 → 5.
 */
export function JournalListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <JournalCardSkeleton key={i} />
      ))}
    </div>
  )
}
