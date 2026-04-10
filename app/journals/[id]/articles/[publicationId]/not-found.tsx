"use client"

import Link from "next/link"
import { FileQuestion, ArrowLeft, Home, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ArticleNotFound() {
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
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 border border-border shadow-sm">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-3">Article Not Found</h1>
        
        <p className="text-muted-foreground mb-8 text-lg">
          The article you are looking for does not exist, has been removed, or you might not have access to it.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button 
            asChild
            size="lg"
            variant="default"
            className="font-medium"
          >
            <Link href="/journals">
              <Search className="mr-2 h-4 w-4" />
              Browse Journals
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            asChild
            className="font-medium"
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
