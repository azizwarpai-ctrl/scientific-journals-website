import { Skeleton } from "@/components/ui/skeleton"

export default function PackagesLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="h-16 w-full border-b bg-background" />

      <main className="flex-1">
        {/* Header Skeleton */}
        <section className="pt-24 pb-16 md:pt-32 md:pb-20 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <Skeleton className="mx-auto mb-4 h-6 w-36 rounded-full" />
            <Skeleton className="mx-auto mb-4 h-12 w-4/5 rounded-lg" />
            <Skeleton className="mx-auto h-6 w-2/3 rounded-lg" />
          </div>
        </section>

        {/* Cards Grid Skeleton */}
        <section className="py-16 md:py-24 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-2xl border bg-card p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-8 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-10 w-1/2 rounded-md mt-4" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg mt-4" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
