import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function JournalCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="h-64 w-full" />
            <CardContent className="pt-6">
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="mb-4 h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="mt-4 flex items-center justify-between">
                    <Skeleton className="h-9 w-24" />
                </div>
            </CardContent>
        </Card>
    )
}
