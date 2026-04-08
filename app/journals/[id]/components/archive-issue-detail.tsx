"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Newspaper,
} from "lucide-react"
import DOMPurify from "dompurify"

import { useGetIssueDetail, type CurrentIssue, type CurrentIssueArticle } from "@/src/features/journals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrentIssueSkeleton } from "@/components/skeletons/current-issue-skeleton"
import { CurrentIssueError } from "@/components/errors/current-issue-error"
import { ArticleItem } from "./article-item"
import { getIssueTitle, getIssueSubtitle } from "./issue-helpers"

interface ArchiveIssueDetailProps {
  journalId: string
  issueId: number
  ojsDomain: string
  ojsPath: string | null
  onBack: () => void
}

export function ArchiveIssueDetail({
  journalId,
  issueId,
  ojsDomain,
  ojsPath,
  onBack,
}: ArchiveIssueDetailProps) {
  const { data: response, isLoading, error, refetch } = useGetIssueDetail(journalId, issueId)
  const [hasCoverError, setHasCoverError] = useState(false)
  const issue = response?.data

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <BackButton onBack={onBack} />
        <CurrentIssueSkeleton />
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <BackButton onBack={onBack} />
        <CurrentIssueError retry={() => refetch()} />
      </div>
    )
  }

  // ── No Data ───────────────────────────────────────────────────
  if (!issue) {
    return (
      <div className="space-y-6">
        <BackButton onBack={onBack} />
        <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted p-3.5 rounded-full mb-5">
              <Newspaper className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Issue Not Found</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              This issue could not be loaded. It may have been unpublished or removed.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Group articles by section ─────────────────────────────────
  const groupedArticles = issue.articles.reduce(
    (groups: Record<string, CurrentIssueArticle[]>, article) => {
      const section = article.sectionTitle || "Articles"
      if (!groups[section]) groups[section] = []
      groups[section].push(article)
      return groups
    },
    {}
  )

  const ojsIssueUrl = ojsPath
    ? `${ojsDomain}/index.php/${ojsPath}/issue/view/${issue.issueId}`
    : null

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Back Navigation */}
      <BackButton onBack={onBack} />

      {/* ─── Issue Header ─── */}
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-lg transition-shadow hover:shadow-xl">
        <div className="flex flex-col md:flex-row">
          {/* Issue Cover */}
          <div className="relative md:w-2/5 lg:w-1/3 bg-muted/20 border-b md:border-b-0 md:border-r border-border/50 p-6 flex flex-col items-center justify-center min-h-[400px]">
            {issue.issueCoverUrl && !hasCoverError ? (
              <div className="relative w-full aspect-[3/4] max-w-[320px] overflow-hidden rounded-md shadow-md ring-1 ring-border/30">
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
              <div className="w-full aspect-[3/4] max-w-[320px] rounded-md bg-muted/40 border border-border/40 border-dashed flex flex-col items-center justify-center text-muted-foreground shadow-inner mx-auto">
                <Newspaper className="h-10 w-10 mb-3 opacity-20" />
                <span className="text-xs uppercase tracking-widest font-semibold opacity-50 text-center px-4">
                  No Cover Available
                </span>
              </div>
            )}
          </div>

          {/* Issue Meta & Description */}
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge
                  variant="secondary"
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5"
                >
                  Archived Issue
                </Badge>

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
                      <span>
                        {new Date(issue.datePublished).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
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
                    }),
                  }}
                />
              )}
            </div>

            {ojsIssueUrl && (
              <div className="mt-8 pt-6 border-t border-border/30 flex justify-start">
                <Button
                  asChild
                  size="default"
                  className="font-semibold gap-2 shadow-sm rounded-full px-6"
                >
                  <Link
                    href={ojsIssueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
      {issue.articles.length > 0 ? (
        <div className="space-y-12 pb-16">
          {Object.entries(groupedArticles).map(([section, articles]) => (
            <div key={section} className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-[0.15em] shrink-0">
                  {section}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent" />
              </div>

              <div className="flex flex-col gap-6">
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
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No articles found in this issue.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Back Button ────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md px-2 py-1 -ml-2"
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      Back to Archive
    </button>
  )
}
