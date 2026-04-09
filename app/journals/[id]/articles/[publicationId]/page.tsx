import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"

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
 * Shared data fetcher memoized per request.
 * Deduplicates database queries between metadata generation and page rendering.
 */
const getArticleData = cache(async (id: string, publicationId: string) => {
  if (!/^[1-9]\d*$/.test(publicationId)) return { error: "INVALID_ID" }
  const publicationIdNum = parseInt(publicationId, 10)

  const journalLookup = await resolveJournalOjsId(id)
  if (!journalLookup) return { error: "JOURNAL_NOT_FOUND" }

  const article = await fetchArticleDetail(journalLookup.ojsId, publicationIdNum)
  if (!article) return { error: "ARTICLE_NOT_FOUND" }

  return { article, journalLookup }
})

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
  const data = await getArticleData(resolvedParams.id, resolvedParams.publicationId)
  
  if (!data || "error" in data) return {}

  const { article } = data
  const abstractText = article.abstract ? article.abstract.replace(/<[^>]*>?/gm, '').substring(0, 160) : ''
  const authorNames = article.authors
    .map(a => `${a.givenName || ''} ${a.familyName || ''}`.trim())
    .filter(name => name.length > 0)

  return {
    title: `${article.title || 'Untitled Article'} | ${article.journalAbbreviation || article.journalTitle || 'Journal'}`,
    description: abstractText,
    keywords: article.keywords.join(', '),
    authors: authorNames.map(name => ({ name })),
    openGraph: {
      title: article.title || 'Untitled Article',
      description: abstractText,
      type: "article",
      authors: authorNames,
      publishedTime: (article.datePublished && !isNaN(new Date(article.datePublished).getTime())) 
        ? new Date(article.datePublished).toISOString() 
        : undefined,
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
  const data = await getArticleData(resolvedParams.id, resolvedParams.publicationId)

  if ("error" in data) {
    notFound()
  }

  const { article } = data

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


