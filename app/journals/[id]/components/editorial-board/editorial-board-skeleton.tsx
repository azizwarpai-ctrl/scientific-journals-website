import { Skeleton } from "@/components/ui/skeleton";

export const EditorialBoardSkeleton = () => {
    return (
        <div className="w-full py-8 space-y-8">
            <div className="space-y-1.5">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-3 w-28" />
                <div className="h-px bg-border" />
                <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
                    <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                    <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-3 w-36" />
                <div className="h-px bg-border" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
