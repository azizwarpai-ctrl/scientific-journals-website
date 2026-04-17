import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { FileQuestion } from "lucide-react"

export default function AboutNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-8">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl font-bold tracking-tight">Page Not Found</h1>
          <p className="mb-8 text-muted-foreground text-lg leading-relaxed">
            We couldn't find the about information you were looking for. It might have been moved or removed.
          </p>
          <Button size="lg" asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
