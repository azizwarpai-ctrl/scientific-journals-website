import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"

export default function Loading() {
  return (
    <div className="container max-w-[1200px] py-10 lg:py-16 mx-auto px-4 sm:px-6">
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-8 cursor-not-allowed opacity-70">
        <ArrowLeft className="h-4 w-4" />
        Back to Journal
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-8 space-y-12">
          {/* Header Skeleton */}
          <div className="space-y-6">
             <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
             </div>
             <Skeleton className="h-10 sm:h-12 w-full lg:w-4/5 rounded-lg" />
             <Skeleton className="h-8 w-3/5 rounded-lg border border-border" />
             <div className="space-y-2 mt-6">
               <Skeleton className="h-5 w-2/3" />
               <Skeleton className="h-4 w-1/3" />
             </div>
          </div>
          
          <div className="h-px bg-border/60 w-full" />
          
          {/* Abstract Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="lg:col-span-4 space-y-8">
            <Skeleton className="h-64 shadow-md rounded-lg w-full max-w-[280px] mx-auto lg:mx-0" />
            <div className="space-y-4">
               <Skeleton className="h-14 w-full rounded-md" />
               <Skeleton className="h-14 w-full rounded-md" />
            </div>
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
            </div>
        </div>
      </div>
    </div>
  )
}
