"use client"

import { useEffect, useRef } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useGetArticleDetail } from "@/src/features/journals/api/use-get-article-detail"
import { recordViewEvent } from "@/src/hooks/use-metric-events"

import { ArticleHeader } from "./article-header"
import { ArticleAbstract } from "./article-abstract"
import { ArticleClientShell } from "./article-client-shell"

interface ArticlePageClientProps {
  journalIdStr: string
  publicationIdStr: string
}

export function ArticlePageClient({ journalIdStr, publicationIdStr }: ArticlePageClientProps) {
  // Try to parse publication ID or let it fail
  const pubId = parseInt(publicationIdStr, 10)

  const { data: responseData, isLoading, error } = useGetArticleDetail(journalIdStr, isNaN(pubId) ? 0 : pubId)

  // UIET-P1: fire a single article_page view once per article load. The
  // server-side recorder dedupes per (article, identity-or-iphash, UTC day).
  const viewFiredRef = useRef<string | null>(null)
  useEffect(() => {
    const article = responseData?.data
    if (!article) return
    const key = `${article.publicationId}`
    if (viewFiredRef.current === key) return
    viewFiredRef.current = key
    recordViewEvent({
      article_id: article.publicationId,
      journal_id: article.journalId,
      source: "article_page",
    })
  }, [responseData])

  if (isNaN(pubId)) {
    return notFound()
  }

  // Integrate specifically with structural Next.js boundaries 
  if (isLoading) {
      // By returning nothing, we defer to Suspense/loading.tsx for the SSR/mount cycle if prefetching failed 
      // But typically React Query doesn't trigger app router loading boundaries directly without useSuspenseQuery
      // For immediate CSR fallback, returning null prevents flash of content.
      // In SSR with HydrationBoundary, data already exists.
      return null 
  }

  if (error) {
    throw error // Propagates to error.tsx
  }

  if (!responseData?.data) {
    return notFound() // Propagates to not-found.tsx
  }

  const article = responseData.data

  return (
    <div className="container max-w-[1200px] py-10 lg:py-16 mx-auto px-4 sm:px-6">
      {/* Back button */}
      <Link 
        href={`/journals/${journalIdStr}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Journal
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-12">
          <ArticleHeader article={article} />
          
          <div className="h-px bg-border/60 w-full" />
          
          <ArticleAbstract abstract={article.abstract} keywords={article.keywords} />
        </div>

        {/* Sidebar & PDF Interactive Elements (Hydrated Client Boundary) */}
        <ArticleClientShell article={article} />
      </div>
    </div>
  )
}
