import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function JournalCardSkeleton() {
  return (
    <Card className="h-full border-none shadow-md overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-9 w-1/3" />
        </div>
      </CardContent>
    </Card>
  )
}

export function JournalListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <JournalCardSkeleton key={i} />
      ))}
    </div>
  )
}
