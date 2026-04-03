"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  User, 
  BookOpen, 
  Calendar,
  Newspaper
} from "lucide-react"
import DOMPurify from "dompurify"

import { useGetCurrentIssue, CurrentIssue, CurrentIssueArticle } from "@/src/features/journals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrentIssueSkeleton } from "@/components/skeletons/current-issue-skeleton"
import { CurrentIssueError } from "@/components/errors/current-issue-error"
import { CurrentIssueNotFound } from "@/components/states/current-issue-not-found"

interface CurrentIssueSectionProps {
  journalId: string
  ojsDomain: string
  ojsPath: string | null
}

export function CurrentIssueSection({ journalId, ojsDomain, ojsPath }: CurrentIssueSectionProps) {
  const { data: response, isLoading, error, refetch } = useGetCurrentIssue(journalId)
  const issue = response?.data

  if (isLoading) return <CurrentIssueSkeleton />
  if (error) return <CurrentIssueError retry={() => refetch()} />
  if (!issue || !issue.articles || issue.articles.length === 0) {
    const ojsUrl = ojsPath ? `${ojsDomain}/index.php/${ojsPath}/issue/current` : null
    return <CurrentIssueNotFound ojsUrl={ojsUrl} message={response?.message} />
  }

  // Dynamic title helpers to respect visibility flags and avoid nulls
  const getIssueTitle = (issue: CurrentIssue) => {
    if (issue.showTitle && issue.title) return issue.title
    
    const parts = []
    if (issue.showVolume && issue.volume) parts.push(`Vol. ${issue.volume}`)
    if (issue.showNumber && issue.number) parts.push(`No. ${issue.number}`)
    const titleBase = parts.join(", ")
    
    return issue.showYear && issue.year 
      ? `${titleBase}${titleBase ? ' ' : ''}(${issue.year})`
      : titleBase || "Current Issue"
  }

  const getIssueSubtitle = (issue: CurrentIssue) => {
    // Only show subtitle if title is currently showing the editor-set title
    if (!issue.showTitle || !issue.title) return null
    if (!issue.showVolume && !issue.showNumber && !issue.showYear) return null

    const parts = []
    if (issue.showVolume && issue.volume) parts.push(`Vol. ${issue.volume}`)
    if (issue.showNumber && issue.number) parts.push(`No. ${issue.number}`)
    const subtitleBase = parts.join(", ")

    return issue.showYear && issue.year
      ? `${subtitleBase}${subtitleBase ? ' ' : ''}(${issue.year})`
      : subtitleBase
  }

  // Group articles by section
  const groupedArticles = issue.articles.reduce((groups: Record<string, CurrentIssueArticle[]>, article) => {
    const section = article.sectionTitle || "Articles"
    if (!groups[section]) groups[section] = []
    groups[section].push(article)
    return groups
  }, {})

  const ojsIssueUrl = ojsPath ? `${ojsDomain}/index.php/${ojsPath}/issue/view/${issue.issueId}` : null

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Issue Header */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Newspaper className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Current Issue</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {getIssueTitle(issue)}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {getIssueSubtitle(issue) && (
                <span className="font-medium">
                  {getIssueSubtitle(issue)}
                </span>
              )}
              {issue.datePublished && (
                <div className="flex items-center gap-1.5 border-l border-border pl-4">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Published: {new Date(issue.datePublished).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>
          
          {ojsIssueUrl && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={ojsIssueUrl} target="_blank" rel="noopener noreferrer">
                View Full Issue on OJS
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {issue.description && (
          <div className="mt-6 pt-6 border-t border-border/60">
            <div 
              className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(issue.description) }}
            />
          </div>
        )}
      </div>

      {/* Article Groups */}
      <div className="space-y-10">
        {Object.entries(groupedArticles).map(([section, articles]) => (
          <div key={section} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-2">
                {section}
              </h3>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            
            <div className="grid gap-4">
              {articles.map((article) => (
                <ArticleItem 
                  key={article.publicationId} 
                  article={article} 
                  ojsDomain={ojsDomain} 
                  ojsPath={ojsPath}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ArticleItem({ article, ojsDomain, ojsPath }: { article: CurrentIssueArticle, ojsDomain: string, ojsPath: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const articleUrl = ojsPath 
    ? `${ojsDomain}/index.php/${ojsPath}/article/view/${article.submissionId}`
    : null

  const sanitizeAbstract = (html: string | null | undefined): string => {
    if (!html) return ""
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
    })
  }

  const authorNames = article.authors
    .map(a => `${a.givenName || ''} ${a.familyName || ''}`.trim())
    .filter(Boolean)
    .join(", ")

  return (
    <div className="group rounded-xl border border-border/40 bg-card/40 p-5 sm:p-6 transition-all duration-300 hover:border-primary/30 hover:bg-card hover:shadow-md">
      <div className="space-y-3">
        {/* Section Badge & Meta */}
        <div className="flex items-center justify-between gap-4">
          {article.sectionTitle && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-2 bg-primary/5 text-primary border-primary/20">
              {article.sectionTitle}
            </Badge>
          )}
          {article.datePublished && (
            <span className="text-xs text-muted-foreground font-medium">
              {new Date(article.datePublished).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="text-base sm:text-lg font-bold leading-snug group-hover:text-primary transition-colors">
          {articleUrl ? (
            <Link href={articleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2">
              {article.title || "Untitled"}
              <ExternalLink className="h-3.5 w-3.5 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ) : (
            article.title || "Untitled"
          )}
        </h4>

        {/* Authors */}
        {authorNames && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground/90 font-medium">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{authorNames}</span>
          </div>
        )}

        {/* Abstract Toggle */}
        {article.abstract && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={`abstract-${article.publicationId}`}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 px-2.5 py-1 rounded-md"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Hide Abstract</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>View Abstract</span>
                </>
              )}
            </button>

            {isExpanded && (
              <div 
                id={`abstract-${article.publicationId}`}
                role="region"
                aria-label={`Abstract for ${article.title}`}
                className="mt-4 animate-in slide-in-from-top-2 duration-300"
              >
                <div className="rounded-lg bg-muted/30 p-4 border border-border/40">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" />
                    Abstract
                  </div>
                  <div 
                    className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeAbstract(article.abstract) }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
