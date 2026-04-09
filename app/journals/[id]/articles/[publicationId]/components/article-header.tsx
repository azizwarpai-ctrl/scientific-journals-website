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
        <ChevronRight className="h-4 w-4" />
        <Link 
          href={`/journals/${article.journalUrlPath}/issues/${article.volume}/${article.issueNumber}`} 
          className="hover:text-primary transition-colors"
        >
          Vol. {article.volume} No. {article.issueNumber} ({article.year})
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground line-clamp-1">{article.title}</span>
      </nav>

      <div className="space-y-4">
        {article.sectionTitle && (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary tracking-wide text-xs uppercase font-bold px-3 py-1">
            {article.sectionTitle}
          </Badge>
        )}

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
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
                className="hover:text-primary hover:underline transition-colors flex items-center gap-1"
              >
                {article.doi}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-border/40">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <User className="h-4 w-4" /> Authors
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {article.authors.map((author, index) => (
              <div key={index} className="flex flex-col gap-1">
                <span className="font-bold text-foreground">
                  {author.givenName} {author.familyName}
                </span>
                {author.affiliation && (
                  <span className="text-sm text-muted-foreground leading-snug">
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
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 font-medium"
                    >
                      ORCID
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {article.keywords && article.keywords.length > 0 && (
        <div className="pt-6">
          <div className="flex flex-wrap gap-2">
            {article.keywords.map((kw, i) => (
              <Badge key={i} variant="secondary" className="font-medium bg-muted text-muted-foreground hover:bg-muted/80">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
