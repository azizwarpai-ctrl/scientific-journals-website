import { Skeleton } from "@/components/ui/skeleton"

export function AdvisoryBoardSkeleton() {
  return (
    <div className="space-y-12 py-8">
      {/* 1. Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-64 rounded-none" />
        <Skeleton className="h-4 w-96 rounded-none" />
      </div>

      {/* 2. Members Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="flex h-[180px] flex-col border border-border bg-card p-5 space-y-4"
          >
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4 rounded-none" />
              <Skeleton className="h-3 w-1/4 rounded-none" />
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-5/6 rounded-none" />
            </div>
            <div className="pt-4 border-t border-border/40">
              <Skeleton className="h-4 w-1/2 rounded-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
