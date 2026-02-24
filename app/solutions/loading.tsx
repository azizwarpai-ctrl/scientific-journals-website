import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 w-full border-b bg-background" /> {/* Navbar placeholder */}

      <main className="flex-1">
        {/* Header Skeleton */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Skeleton className="mx-auto mb-6 h-12 w-2/3" />
              <Skeleton className="mx-auto h-6 w-3/4" />
            </div>
          </div>
        </section>

        {/* Solutions Grid Skeleton */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[250px] rounded-xl border bg-card p-6 shadow-sm">
                  <Skeleton className="mb-4 h-12 w-12 rounded-lg" />
                  <Skeleton className="mb-2 h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
