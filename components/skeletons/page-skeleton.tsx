import { Skeleton } from "@/components/ui/skeleton"

export function PageSkeleton() {
    return (
        <div className="container mx-auto py-10 px-4 md:px-6 space-y-8 animate-pulse">
            <div className="space-y-2">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    )
}
