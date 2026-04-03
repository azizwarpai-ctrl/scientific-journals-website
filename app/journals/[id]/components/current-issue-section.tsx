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
  Newspaper,
  FileText
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
  const [hasCoverError, setHasCoverError] = useState(false)
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
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* ─── Issue Header ─── */}
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-lg transition-shadow hover:shadow-xl">
        <div className="flex flex-col md:flex-row">
          
          {/* Issue Cover Focus Area */}
          <div className="relative md:w-1/3 lg:w-1/4 bg-muted/20 border-b md:border-b-0 md:border-r border-border/50 p-6 flex flex-col items-center justify-center min-h-[300px]">
            {issue.issueCoverUrl && !hasCoverError ? (
              <div className="relative w-full aspect-[3/4] max-w-[240px] overflow-hidden rounded-md shadow-md ring-1 ring-border/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={issue.issueCoverUrl} 
                  alt={getIssueTitle(issue)}
                  className="object-cover w-full h-full"
                  onError={() => setHasCoverError(true)}
                />
              </div>
            ) : (
               <div className="w-full aspect-[3/4] max-w-[240px] rounded-md bg-muted/40 border border-border/40 border-dashed flex flex-col items-center justify-center text-muted-foreground shadow-inner mx-auto">
                <Newspaper className="h-10 w-10 mb-3 opacity-20" />
                <span className="text-xs uppercase tracking-widest font-semibold opacity-50 text-center px-4">No Cover Available</span>
              </div>
            )}
          </div>

          {/* Issue Meta & Description */}
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Badge variant="default" className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                    Current Issue
                  </Badge>
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground/90 leading-tight">
                  {getIssueTitle(issue)}
                </h2>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm text-muted-foreground">
                  {getIssueSubtitle(issue) && (
                    <span className="font-semibold text-foreground/70">
                      {getIssueSubtitle(issue)}
                    </span>
                  )}
                  {issue.datePublished && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary/70" />
                      <span>{new Date(issue.datePublished).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>

              {issue.description && (
                <div 
                  className="text-base leading-relaxed text-muted-foreground/90 prose prose-base max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(issue.description) }}
                />
              )}
            </div>

            {ojsIssueUrl && (
              <div className="mt-8 pt-6 border-t border-border/30 flex justify-start">
                <Button asChild size="default" className="font-semibold gap-2 shadow-sm rounded-full px-6">
                  <Link href={ojsIssueUrl} target="_blank" rel="noopener noreferrer">
                    View Full Issue on OJS
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Article Groups ─── */}
      <div className="space-y-12 pb-16">
        {Object.entries(groupedArticles).map(([section, articles]) => (
          <div key={section} className="space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-extrabold text-foreground uppercase tracking-[0.15em] shrink-0">
                {section}
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent" />
            </div>
            
            {/* Grid Layout applies here */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
  const [hasCoverError, setHasCoverError] = useState(false)
  
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
    <div className="group relative flex flex-col h-full rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1">
      {/* Visual Cover Area */}
      <div className="relative aspect-[16/9] w-full bg-muted/30 border-b border-border/30 overflow-hidden flex-shrink-0">
        {article.articleCoverUrl && !hasCoverError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={article.articleCoverUrl} 
            alt={`Cover for ${article.title || 'article'}`}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            onError={() => setHasCoverError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 bg-gradient-to-br from-muted/20 to-muted/50">
             <FileText className="h-12 w-12 mb-2" strokeWidth={1} />
          </div>
        )}
        
        {/* Modern floating badge */}
        {article.sectionTitle && (
          <div className="absolute top-3 left-3">
             <Badge className="bg-background/90 text-foreground backdrop-blur-sm shadow-sm border-border/20 text-[10px] uppercase font-bold py-1 px-2.5">
               {article.sectionTitle}
             </Badge>
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1 gap-4">
        <div className="space-y-3 flex-1">
          {/* Title */}
          <h4 className="text-lg font-bold leading-tight line-clamp-3 group-hover:text-primary transition-colors">
            {articleUrl ? (
              <Link href={articleUrl} target="_blank" rel="noopener noreferrer" className="focus:outline-none">
                {article.title || "Untitled"}
                {/* Expand click area subtly */}
                <span className="absolute inset-0 z-10" aria-hidden="true" />
              </Link>
            ) : (
              article.title || "Untitled"
            )}
          </h4>

          {/* Authors */}
          {authorNames && (
            <div className="flex items-start gap-2.5 text-sm text-foreground/70 font-medium">
              <User className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
              <span className="line-clamp-2 leading-relaxed">{authorNames}</span>
            </div>
          )}
        </div>

        {/* Abstract Toggle */}
        {article.abstract && (
          <div className="pt-2 relative z-20">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setIsExpanded(!isExpanded)
              }}
              aria-expanded={isExpanded}
              aria-controls={`abstract-${article.publicationId}`}
              className="group/btn flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  <span>Hide Abstract</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 group-hover/btn:translate-y-0.5 transition-transform" />
                  <span>View Abstract</span>
                </>
              )}
            </button>

            <div 
              id={`abstract-${article.publicationId}`}
              role="region"
              aria-label={`Abstract for ${article.title}`}
              className={`overflow-hidden transition-all duration-300 ${isExpanded ? "mt-4 max-h-[400px] opacity-100" : "max-h-0 opacity-0"}`}
            >
              <div className="rounded-xl bg-muted/40 p-4 border border-border/30 overflow-y-auto max-h-[350px] scrollbar-thin">
                <div 
                  className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizeAbstract(article.abstract) }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-4 mt-auto border-t border-border/40 flex items-center justify-between relative z-20">
          {article.datePublished ? (
            <span className="text-[11px] text-muted-foreground/80 font-bold uppercase tracking-wider">
               {new Date(article.datePublished).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          ) : (
            <span />
          )}
          
          {articleUrl && (
             <Button asChild variant="ghost" size="sm" className="h-8 gap-2 text-primary hover:bg-primary/10 rounded-full px-4 -mr-2">
               <Link href={articleUrl} target="_blank" rel="noopener noreferrer">
                 Read
                 <ExternalLink className="h-3.5 w-3.5 opacity-70" />
               </Link>
             </Button>
          )}
        </div>
      </div>
    </div>
  )
}

