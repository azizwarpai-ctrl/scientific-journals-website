import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 w-full border-b bg-background" /> {/* Navbar placeholder */}

      <main className="flex-1">
        {/* Header Skeleton */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Skeleton className="mx-auto mb-4 h-12 w-2/3" />
              <Skeleton className="mx-auto h-6 w-1/2" />
            </div>
          </div>
        </section>

        {/* Filter Bar Skeleton */}
        <section className="border-b bg-background py-6">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Skeleton className="h-10 w-full max-w-md" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-[180px]" />
                <Skeleton className="h-10 w-[180px]" />
              </div>
            </div>
          </div>
        </section>

        {/* Journals Grid Skeleton */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-6 flex items-center">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
                  <Skeleton className="h-80 w-full rounded-t-xl" />
                  <div className="p-6">
                    <Skeleton className="mb-2 h-4 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
