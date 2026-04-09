'use client'

import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function ArticleNotFound() {
  const params = useParams()
  const journalId = params?.id as string

  return (
    <div className="container max-w-[1200px] py-24 mx-auto px-4 sm:px-6 min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="bg-destructive/10 p-5 rounded-3xl mb-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Article Not Found</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-10 text-lg leading-relaxed">
          We couldn't locate the scholarly article you're looking for. 
          It might have been retracted, moved, or the URL identifier is incorrect.
        </p>
        <Link 
          href={journalId ? `/journals/${journalId}` : "/"}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Journal
        </Link>
      </div>
    </div>
  )
}
