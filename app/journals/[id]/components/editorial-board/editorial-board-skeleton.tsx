import { Skeleton } from "@/components/ui/skeleton";

function MemberCardSkeleton() {
    return (
        <div className="flex flex-row overflow-hidden rounded-2xl border border-border/60 bg-card">
            <div className="w-1/3 flex-shrink-0">
                <Skeleton className="aspect-[3/4] h-full w-full rounded-none" />
            </div>
            <div className="flex w-2/3 flex-1 flex-col gap-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="mt-auto pt-2">
                    <div className="h-px bg-border/60" />
                    <div className="mt-3 flex items-center gap-2">
                        <Skeleton className="h-5 w-20 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                </div>
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 max-w-4xl">
                    <MemberCardSkeleton />
                    <MemberCardSkeleton />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-3 w-36" />
                <div className="h-px bg-border" />
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <MemberCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}
