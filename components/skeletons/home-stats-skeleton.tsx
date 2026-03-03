import { Skeleton } from "@/components/ui/skeleton"

export function HomeStatsSkeleton() {
    return (
        <div className="grid gap-8 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center">
                    <Skeleton className="mx-auto mb-2 h-10 w-24" />
                    <Skeleton className="mx-auto h-4 w-32" />
                </div>
            ))}
        </div>
    )
}
