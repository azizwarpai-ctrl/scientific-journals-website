import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton matching the new vertical spotlight JournalCard (3:4 aspect ratio).
 * Shows a shimmer for the image area (~75%) and content area (~25%).
 */
export function JournalCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md aspect-[3/4]">
      {/* Image placeholder – flex-[3] matches the real card */}
      <Skeleton className="flex-[3] w-full rounded-none" />

      {/* Content placeholder – flex-[1] matches the real card */}
      <div className="flex flex-[1] flex-col justify-between gap-2 px-4 py-4">
        {/* Title lines */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        {/* Button placeholder */}
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  )
}
