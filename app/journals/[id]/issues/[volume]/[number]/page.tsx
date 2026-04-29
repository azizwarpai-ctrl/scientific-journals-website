import { ArrowLeft, BookOpen, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import sanitizeHtml from "sanitize-html"

import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal"
import { fetchIssueIdByVolumeNumber, fetchIssueWithArticles } from "@/src/features/journals/server/archive-issue-service"
import { ArticleItem } from "../../../components/article-item"
import type { CurrentIssueArticle } from "@/src/features/journals"

interface PageProps {
  params: Promise<{
    id: string
    volume: string
    number: string
  }>
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id, volume, number } = await params
  
  // Validate volume is a number
  const volumeNum = parseInt(volume, 10)
  if (isNaN(volumeNum)) {
    notFound()
  }

  const journalLookup = await resolveJournalOjsId(id)
  if (!journalLookup.found || !journalLookup.ojsId) notFound()

  const issueId = await fetchIssueIdByVolumeNumber(
    journalLookup.ojsId, 
    volumeNum, 
    number
  )
  
  if (!issueId) notFound()

  const issue = await fetchIssueWithArticles(journalLookup.ojsId, issueId)
  if (!issue) notFound()

  // Sanitize description for server-side injection
  const safeDescription = issue.description ? sanitizeHtml(issue.description, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4'],
    allowedAttributes: {},
  }) : ""

  const isValidCoverUrl = (urlStr: string | null | undefined): boolean => {
    if (!urlStr) return false
    try {
      const url = new URL(urlStr)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const issueDate = issue.datePublished ? new Date(issue.datePublished) : null
  const isValidDate = issueDate && !isNaN(issueDate.getTime())

  return (
    <div className="container max-w-[1200px] py-10 lg:py-16 mx-auto px-4 sm:px-6">
      {/* Back to Journal */}
      <Link 
        href={`/journals/${id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Journal
      </Link>

      <div className="space-y-12">
        {/* Issue Header */}
        <div className="flex flex-col md:flex-row gap-5 sm:gap-6 md:gap-8 items-start">
          {isValidCoverUrl(issue.issueCoverUrl) && (
            <div className="relative w-40 sm:w-52 md:w-64 mx-auto md:mx-0 aspect-[3/4] rounded-2xl overflow-hidden border border-border/40 shadow-xl flex-shrink-0">
               <Image 
                 src={issue.issueCoverUrl!} 
                 alt={issue.title || "Issue Cover"}
                 fill
                 sizes="(max-width: 640px) 160px, (max-width: 768px) 208px, 256px"
                 className="object-cover"
               />
            </div>
          )}
          
          <div className="flex-1 space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              {issue.title || `Vol. ${issue.volume} No. ${issue.number}`}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary/70" />
                <span>Vol. {issue.volume} No. {issue.number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary/70" />
                <span>{issue.year}</span>
              </div>
              {isValidDate && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary/70" />
                  <span>Published: {issueDate!.toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {safeDescription && (
              <div 
                className="pt-4 text-muted-foreground leading-relaxed max-w-3xl prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            )}
          </div>
        </div>

        {/* Article List */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
             <h2 className="text-2xl font-bold">Articles in this Issue</h2>
             <span className="text-sm text-muted-foreground font-medium">{issue.articles.length} total articles</span>
          </div>

          <div className="grid gap-6">
            {issue.articles.map((article: CurrentIssueArticle) => (
              <ArticleItem key={article.publicationId} article={article} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
