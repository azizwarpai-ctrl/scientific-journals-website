import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"

import { fetchArticleDetail } from "@/src/features/journals/server/article-detail-service"
import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal"

import { ArticleHeader } from "./components/article-header"
import { ArticleAbstract } from "./components/article-abstract"
import { ArticleClientShell } from "./components/article-client-shell"
import { ArticleJsonLd } from "./components/article-jsonld"

interface PageProps {
  params: Promise<{
    id: string
    publicationId: string
  }>
}

/**
 * Generate highly optimized Server-Side SEO tags based on the Article metadata.
 * Uses robust fetching to ensure Google Scholar and cross-ref can accurately
 * index articles directly from the Digitopub system.
 */
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params
  const publicationIdNum = parseInt(resolvedParams.publicationId, 10)
  
  if (isNaN(publicationIdNum)) return {}

  const journalLookup = await resolveJournalOjsId(resolvedParams.id)
  if (!journalLookup) return {}

  const article = await fetchArticleDetail(journalLookup.ojsId, publicationIdNum)
  if (!article) return {}

  const abstractText = article.abstract ? article.abstract.replace(/<[^>]*>?/gm, '').substring(0, 160) : ''
  const authorNames = article.authors.map(a => `${a.givenName || ''} ${a.familyName || ''}`.trim())

  return {
    title: `${article.title} | ${article.journalAbbreviation || article.journalTitle || 'Journal'}`,
    description: abstractText,
    keywords: article.keywords.join(', '),
    authors: authorNames.map(name => ({ name })),
    openGraph: {
      title: article.title || 'Untitled Article',
      description: abstractText,
      type: "article",
      authors: authorNames,
      publishedTime: article.datePublished ? new Date(article.datePublished).toISOString() : undefined,
    },
  }
}

/**
 * Fully Server-Side Rendered (SSR) Article Detail Page
 * No 'use client' directives means this page delivers its complete HTML payload
 * upfront — ensuring critical 100% indexing capability for scholarly content.
 */
export default async function ArticleDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const publicationIdNum = parseInt(resolvedParams.publicationId, 10)

  if (isNaN(publicationIdNum)) {
    notFound()
  }

  const journalLookup = await resolveJournalOjsId(resolvedParams.id)

  if (!journalLookup) {
    return (
      <ErrorState 
        journalId={resolvedParams.id} 
        message="Journal not found system-wide. Cannot load article details." 
      />
    )
  }

  const article = await fetchArticleDetail(journalLookup.ojsId, publicationIdNum)

  if (!article) {
    return (
      <ErrorState 
        journalId={resolvedParams.id} 
        message="The article you are looking for could not be found or has been removed." 
      />
    )
  }

  return (
    <>
      <ArticleJsonLd article={article} />
      
      <div className="container max-w-[1200px] py-10 lg:py-16 mx-auto px-4 sm:px-6">
        {/* Back button */}
        <Link 
          href={`/journals/${resolvedParams.id}`}
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
            
            <ArticleAbstract abstract={article.abstract} />
          </div>

          {/* Sidebar & PDF Interactive Elements (Hydrated Client Boundary) */}
          <ArticleClientShell article={article} />
        </div>
      </div>
    </>
  )
}

function ErrorState({ journalId, message }: { journalId: string, message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="bg-destructive/10 p-4 rounded-full mb-4">
        <ArrowLeft className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {message}
      </p>
      <Link 
        href={`/journals/${journalId}`}
        className="text-primary hover:underline font-medium"
      >
        Return to Journal
      </Link>
    </div>
  )
}
