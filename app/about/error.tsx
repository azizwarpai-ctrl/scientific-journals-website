"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AlertTriangle } from "lucide-react"

export default function AboutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-8">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="mb-4 text-3xl md:text-4xl font-bold tracking-tight">Something went wrong</h1>
          <p className="mb-8 text-muted-foreground text-lg leading-relaxed">
            We encountered an error while trying to load the about page information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={reset} size="lg">
              Try again
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="/">Return to Home</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
