import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/admin/table-skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}
