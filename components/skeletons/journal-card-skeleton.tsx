import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton matching the spotlight JournalCard (fixed 320px height,
 * 78% image / 22% content split).
 */
export function JournalCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md h-[320px]">
      {/* Image placeholder – 78% height */}
      <Skeleton className="h-[78%] w-full rounded-none" />

      {/* Content placeholder – 22% height, centered */}
      <div className="flex h-[22%] flex-col items-center justify-center gap-1.5 px-3 py-2">
        {/* Title lines */}
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-3/5" />
        {/* View Details placeholder */}
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}
