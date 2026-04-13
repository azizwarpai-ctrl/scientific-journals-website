// Server Component — no interactivity, fully SSR-rendered for SEO

import Link from "next/link"
import { ChevronRight, Calendar, User, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ArticleDetail } from "@/src/features/journals"

interface ArticleHeaderProps {
  article: ArticleDetail
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm font-medium text-muted-foreground space-x-2">
        <Link href={`/journals/${article.journalUrlPath}`} className="hover:text-primary transition-colors">
          {article.journalAbbreviation || article.journalTitle}
        </Link>
        {article.volume != null && article.issueNumber != null && article.year != null ? (
          <>
            <Link 
              href={`/journals/${article.journalUrlPath}/issues/${article.volume}/${article.issueNumber}`} 
              className="hover:text-primary transition-colors"
            >
              Vol. {article.volume} No. {article.issueNumber} ({article.year})
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        ) : (
          <>
            <span className="text-muted-foreground/60 italic">Unassigned Issue</span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-foreground line-clamp-1">{article.title}</span>
      </nav>

      <div className="space-y-4">
        {article.sectionTitle && (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary tracking-wide text-xs uppercase font-bold px-3 py-1">
            {article.sectionTitle}
          </Badge>
        )}

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          {article.title || "Untitled Article"}
        </h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm text-muted-foreground">
          {article.datePublished && !isNaN(new Date(article.datePublished).getTime()) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary/70" />
              <span>
                Published: {new Date(article.datePublished).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          
          {article.doi && (
            <div className="flex items-center gap-2">
              <span className="font-semibold px-2 py-0.5 rounded-md bg-muted/50 border border-border/40">DOI</span>
              <a 
                href={`https://doi.org/${article.doi}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline transition-colors flex items-center gap-1 break-all"
              >
                {article.doi}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-border/40">
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
            <User className="h-3.5 w-3.5" /> Authors
          </h3>
          <div className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
            {article.authors.map((author, index) => (
              <div key={index} className="flex flex-col gap-1.5 group">
                <span className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors">
                  {author.givenName} {author.familyName}
                </span>
                {author.affiliation && (
                  <span className="text-xs text-muted-foreground/80 leading-relaxed font-medium">
                    {author.affiliation}
                  </span>
                )}
                {author.orcid && (() => {
                  const identifier = author.orcid.split('/').filter(Boolean).pop()?.trim() || "";
                  const isValid = /^(\d{4}-){3}\d{3}[\dX]$/.test(identifier);
                  if (!isValid) return null;
                  
                  return (
                    <a 
                      href={`https://orcid.org/${identifier}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1 font-bold uppercase tracking-wider"
                    >
                      ORCID 
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {article.keywords && article.keywords.length > 0 && (
        <div className="pt-8 border-t border-border/40">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
            Keywords
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {article.keywords.map((kw, i) => (
              <Badge 
                key={i} 
                variant="secondary"
                data-slot="badge"
                className="px-3.5 py-1.5 rounded-lg bg-muted/30 text-muted-foreground text-[11px] font-bold border border-border/40 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all cursor-default shadow-sm"
              >
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

