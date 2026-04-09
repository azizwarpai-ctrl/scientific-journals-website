'use client'

import { AlertCircle, ArrowLeft, Home } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function GlobalNotFound() {
  const pathname = usePathname()
  
  // Heuristic to extract journal ID from path like /journals/[id]/...
  const journalMatch = pathname?.match(/\/journals\/([^\/]+)/)
  const journalId = journalMatch ? journalMatch[1] : null

  return (
    <div className="container max-w-[1200px] py-24 mx-auto px-4 sm:px-6 min-h-[70vh] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="bg-destructive/10 p-5 rounded-3xl mb-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Content Not Found</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-10 text-lg leading-relaxed">
          The page or resource you are looking for doesn't exist or has been moved. 
          Please check the URL or use the links below to return to a valid section.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {journalId && (
            <Link 
              href={`/journals/${journalId}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Journal
            </Link>
          )}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all border border-border/40"
          >
            <Home className="h-5 w-5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
