"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[Article Detail Error Boundary]:", error)
  }, [error])

  const errorMessage = error.message.includes("fetch") 
    ? "There was a problem connecting to the journal database. Please try again."
    : "An unexpected error occurred while loading this article."

  const router = useRouter()

  return (
    <div className="container max-w-[1200px] py-16 mx-auto px-4 sm:px-6 min-h-[60vh] flex flex-col">
      <button 
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group mb-8 self-start"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Go Back
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6 border border-destructive/20 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-destructive/5 animate-pulse" />
          <AlertCircle className="h-10 w-10 text-destructive relative z-10" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-3">Unable to Load Article</h1>
        
        <p className="text-muted-foreground mb-8 text-lg">
          {errorMessage}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button 
            onClick={() => reset()} 
            size="lg"
            className="font-medium min-w-[140px]"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            asChild
            className="font-medium min-w-[140px]"
          >
            <Link href="/journals">
              Browse Journals
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
