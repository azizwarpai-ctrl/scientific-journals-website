"use client"

import sanitizeHtml from "sanitize-html"

interface ArticleAbstractProps {
  abstract: string | null
}

export function ArticleAbstract({ abstract }: ArticleAbstractProps) {
  if (!abstract) return null

  const sanitized = sanitizeHtml(abstract, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'b', 'i', 'sup', 'sub'],
    allowedAttributes: {},
  })

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Abstract</h3>
      <div 
        className="text-[13px] leading-relaxed text-muted-foreground/90 max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>

  )
}
