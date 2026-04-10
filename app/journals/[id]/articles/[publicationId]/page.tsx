import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query"

import { client } from "@/src/lib/rpc"
import { ArticlePageClient } from "./components/article-page-client"
import type { ArticleDetail, ArticleDetailAuthor } from "@/src/features/journals/types/article-detail-types"

interface PageProps {
  params: Promise<{
    id: string
    publicationId: string
  }>
}

/**
 * Shared data fetcher memoized per request.
 * Migrated to utilize the strictly typed Hono API boundary, eliminating 
 * direct module usage and isolating CMS data via true API separation.
 */
const getArticleData = cache(async (id: string, publicationId: string) => {
  if (!/^[1-9]\d*$/.test(publicationId)) return { error: "INVALID_ID" }

  try {
    const response = await client.journals[":id"]["articles"][":publicationId"].$get({
      param: { id, publicationId },
    })

    if (!response.ok) {
      if (response.status === 404) return { error: "ARTICLE_NOT_FOUND" }
      console.error(`[ArticleDetailPage] API error for journal=${id}, pub=${publicationId}: ${response.statusText}`)
      return { error: "SERVER_ERROR" }
    }

    const payload = await response.json()
    if (!payload.success || !payload.data) {
       return { error: "ARTICLE_NOT_FOUND" }
    }

    return { article: payload.data as ArticleDetail }
  } catch (err) {
    console.error(`[ArticleDetailPage] RPC call failed for journal=${id}, pub=${publicationId}:`, err)
    return { error: "SERVER_ERROR" }
  }
})

/**
 * Generate highly optimized Server-Side SEO tags based on the Article metadata.
 * Uses robust fetching to ensure Google Scholar and cross-ref can accurately
 * index articles directly from the Digitopub system.
 */
export async function generateMetadata(
  { params }: PageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params
  const data = await getArticleData(resolvedParams.id, resolvedParams.publicationId)
  
  if (!data || "error" in data) return {}

  const { article } = data
  const abstractText = article.abstract ? article.abstract.replace(/<[^>]*>?/gm, '').substring(0, 160) : ''
  const authorNames = article.authors
    .map((a: ArticleDetailAuthor) => `${a.givenName || ''} ${a.familyName || ''}`.trim())
    .filter((name: string) => name.length > 0)

  return {
    title: `${article.title || 'Untitled Article'} | ${article.journalAbbreviation || article.journalTitle || 'Journal'}`,
    description: abstractText,
    keywords: article.keywords?.join(', ') || '',
    authors: authorNames.map((name: string) => ({ name })),
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
 * Server-Side Rendered (SSR) Article Detail Page with React Query Hydration
 * Prefetches CMS data using internal APIs, populates state into the specialized hook, 
 * and relies on integrated Nextjs boundaries for robust fault tolerance.
 */
export default async function ArticleDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const publicationIdNum = parseInt(resolvedParams.publicationId, 10)

  if (isNaN(publicationIdNum)) {
    notFound()
  }

  const queryClient = new QueryClient()

  // SSR Prefetch the query key required by our specialized hook exactly
  await queryClient.prefetchQuery({
    queryKey: ["journal-article-detail", resolvedParams.id, publicationIdNum],
    queryFn: async () => {
      const data = await getArticleData(resolvedParams.id, resolvedParams.publicationId)
      
      // We throw errors in fetcher specifically so react-query catches them or error boundaries engage
      if (data.error === "SERVER_ERROR") throw new Error("Internal Server Error fetching article data via API")
      if (data.error === "ARTICLE_NOT_FOUND" || data.error === "INVALID_ID") return { data: null } // will resolve as empty, hooked correctly

      return { data: data.article, message: undefined }
    }
  })

  // We explicitly throw structural boundary errors here prior to payload construction
  // This triggers error.tsx natively if cache resulted in a system failure
  const dehydratedState = dehydrate(queryClient)
  const cachedResult = dehydratedState.queries.find(q => q.queryKey[0] === "journal-article-detail")
  
  if (cachedResult?.state?.error) {
    throw new Error("Unable to fetch structural resources safely for the article.")
  }

  return (
    <HydrationBoundary state={dehydratedState}>
       <ArticlePageClient 
          journalIdStr={resolvedParams.id} 
          publicationIdStr={resolvedParams.publicationId} 
       />
    </HydrationBoundary>
  )
}
