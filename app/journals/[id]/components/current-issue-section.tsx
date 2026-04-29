"use client"

import { useState } from "react"
import Image from "next/image"
import { 
  Calendar,
  Newspaper,
} from "lucide-react"
import DOMPurify from "dompurify"

import { useGetCurrentIssue, CurrentIssueArticle } from "@/src/features/journals"
import { Badge } from "@/components/ui/badge"
import { CurrentIssueSkeleton } from "@/components/skeletons/current-issue-skeleton"
import { CurrentIssueError } from "@/components/errors/current-issue-error"
import { CurrentIssueNotFound } from "@/components/states/current-issue-not-found"
import { ArticleItem } from "./article-item"
import { getIssueTitle, getIssueSubtitle } from "./issue-helpers"

interface CurrentIssueSectionProps {
  journalId: string
}

export function CurrentIssueSection({ journalId }: CurrentIssueSectionProps) {
  const { data: response, isLoading, error, refetch } = useGetCurrentIssue(journalId)
  const [hasCoverError, setHasCoverError] = useState(false)
  const issue = response?.data

  if (isLoading) return <CurrentIssueSkeleton />
  if (error) return <CurrentIssueError retry={() => refetch()} />
  if (!issue || !issue.articles || issue.articles.length === 0) {
    return <CurrentIssueNotFound message={response?.message} />
  }


  // Group articles by section
  const groupedArticles = issue.articles.reduce((groups: Record<string, CurrentIssueArticle[]>, article) => {
    const section = article.sectionTitle || "Articles"
    if (!groups[section]) groups[section] = []
    groups[section].push(article)
    return groups
  }, {})



  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* ─── Issue Header ─── */}
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-lg transition-shadow hover:shadow-xl">
        <div className="flex flex-col md:flex-row">
          
          {/* Issue Cover Focus Area */}
          <div className="relative md:w-2/5 lg:w-1/3 bg-muted/20 border-b md:border-b-0 md:border-r border-border/50 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[340px] md:min-h-[400px]">
            {issue.issueCoverUrl && !hasCoverError ? (
              <div className="relative w-full aspect-[3/4] max-w-[200px] sm:max-w-[260px] md:max-w-[320px] overflow-hidden rounded-md shadow-md ring-1 ring-border/30">
                <Image 
                  src={issue.issueCoverUrl} 
                  alt={getIssueTitle(issue)}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover"
                  onError={() => setHasCoverError(true)}
                />
              </div>
            ) : (
               <div className="w-full aspect-[3/4] max-w-[200px] sm:max-w-[260px] md:max-w-[320px] rounded-md bg-muted/40 border border-border/40 border-dashed flex flex-col items-center justify-center text-muted-foreground shadow-inner mx-auto">
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
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(issue.description, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
                      ALLOWED_ATTR: [],
                    }) 
                  }}
                />
              )}
            </div>

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
            
            {/* List Layout */}
            <div className="flex flex-col gap-6">
              {articles.map((article) => (
                <ArticleItem 
                  key={article.publicationId} 
                  article={article} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


