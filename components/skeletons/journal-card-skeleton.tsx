import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton matching the premium magazine-style JournalCard
 * (horizontal layout, image left, content right).
 */
export function JournalCardSkeleton() {
  return (
    <div className="flex flex-col md:flex-row overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md h-full min-h-[300px]">
      {/* Image area */}
      <div className="w-full md:w-5/12 aspect-[4/3] md:aspect-auto relative bg-muted/20 flex items-center justify-center">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
      </div>

      {/* Content area */}
      <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between">
        <div>
          <div className="flex gap-3 mb-4">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 md:h-10 w-4/5 mb-2" />
          <Skeleton className="h-8 md:h-10 w-3/5 mb-6" />
          
          <div className="space-y-4 mt-6 opacity-80">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
        
        <Skeleton className="h-10 w-32 mt-8 rounded-lg" />
      </div>
    </div>
  )
}
