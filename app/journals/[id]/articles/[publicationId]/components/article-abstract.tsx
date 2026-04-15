"use client"

import { Badge } from "@/components/ui/badge"

interface ArticleAbstractProps {
  abstract: string | null
  keywords?: string[]
}

export function ArticleAbstract({ abstract, keywords }: ArticleAbstractProps) {
  if (!abstract && (!keywords || keywords.length === 0)) return null

  return (
    <div className="space-y-6">
      {abstract && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Abstract</h3>
          <div
            className="text-[13px] leading-relaxed text-muted-foreground/90 max-w-none prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: abstract }}
          />
        </div>
      )}

      {keywords && keywords.length > 0 && (
        <div className="pt-4 border-t border-border/40 space-y-3">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Keywords</h3>
          <div className="flex flex-wrap gap-2.5">
            {keywords.map((kw, i) => (
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
