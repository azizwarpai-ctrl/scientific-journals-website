import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/admin/table-skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-28 ml-auto" />
      </div>
      <TableSkeleton rows={8} columns={6} />
    </div>
  )
}
