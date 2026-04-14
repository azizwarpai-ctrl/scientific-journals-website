"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ChevronDown,
  ChevronUp,
  Download,
  User,
  FileText
} from "lucide-react"
import { useParams } from "next/navigation"
import DOMPurify from "dompurify"

import type { CurrentIssueArticle } from "@/src/features/journals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ModalPdfViewer } from "../articles/[publicationId]/components/modal-pdf-viewer"

interface ArticleItemProps {
  article: CurrentIssueArticle
}

/**
 * Shared article card component used by both Current Issue and Archive Issue Detail.
 * Displays article cover, title, authors, abstract toggle, and action footer.
 */
export function ArticleItem({ article }: ArticleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasCoverError, setHasCoverError] = useState(false)
  const params = useParams()
  const journalId = params?.id as string

  if (!journalId) return null

  const articleUrl = `/journals/${journalId}/articles/${article.publicationId}`

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
    <div className="group relative flex flex-col sm:flex-row rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1">
      {/* Visual Cover Area */}
      <div className="relative sm:w-56 md:w-64 flex-shrink-0 aspect-[3/4] sm:aspect-auto bg-muted/5 border-b sm:border-b-0 sm:border-r border-border/30 overflow-hidden min-h-[280px]">
        {article.articleCoverUrl && !hasCoverError ? (
          <Image
            src={article.articleCoverUrl}
            alt={`Cover for ${article.title || 'article'}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain object-center p-4 transition-transform duration-300 group-hover:scale-[1.02]"
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
          <Link href={articleUrl} className="focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-sm">
            <h4 className="text-lg font-bold leading-tight line-clamp-3 group-hover:text-primary transition-colors">
              {article.title || "Untitled"}
            </h4>
          </Link>

          {/* Authors */}
          {authorNames && (
            <div className="flex items-start gap-2.5 text-sm text-foreground/70 font-medium">
              <User className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
              <span className="line-clamp-2 leading-relaxed">{authorNames}</span>
            </div>
          )}

          {/* DOI */}
          {article.doi && (
            <div className="inline-flex items-center gap-1.5 mt-1 text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border/40 w-fit">
              <span className="font-bold">DOI</span>
              <Link
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="select-text hover:text-primary hover:underline transition-colors block break-all"
              >
                {article.doi}
              </Link>
            </div>
          )}

          {/* Keywords */}
          {article.keywords && article.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {article.keywords.map((kw, i) => (
                <Badge
                  key={i}
                  variant="default"
                  className="px-2.5 py-0.5 rounded-full text-[12px] font-bold border border-border/40 cursor-default bg-primary/10 text-muted-foreground hover:text-primary-foreground"
                >
                  {kw}
                </Badge>
              ))}
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

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-2 rounded-full px-4">
              <Link href={articleUrl}>
                View Article
              </Link>
            </Button>
            {article.pdfUrl && (
              <ModalPdfViewer pdfUrl={article.pdfUrl} articleTitle={article.title || undefined} triggerStyle="card" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
