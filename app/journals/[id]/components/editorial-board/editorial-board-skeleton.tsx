import { Skeleton } from "@/components/ui/skeleton";

function MemberCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
            </div>
        </div>
    )
}

export const EditorialBoardSkeleton = () => {
    return (
        <div className="w-full py-8 space-y-10">
            <div className="space-y-1.5">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-3 w-28" />
                <div className="h-px bg-border" />
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 max-w-4xl">
                    <MemberCardSkeleton />
                    <MemberCardSkeleton />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-3 w-36" />
                <div className="h-px bg-border" />
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <MemberCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}
