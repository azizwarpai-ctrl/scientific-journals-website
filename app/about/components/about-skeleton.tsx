import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Skeleton } from "@/components/ui/skeleton"

export function AboutSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="py-24 md:py-32 border-b border-border/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center space-y-4">
              <Skeleton className="h-16 w-3/4 mx-auto rounded-xl" />
              <Skeleton className="h-6 w-full rounded-md" />
              <Skeleton className="h-6 w-4/5 mx-auto rounded-md" />
            </div>
          </div>
        </section>
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6 grid gap-8 md:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
