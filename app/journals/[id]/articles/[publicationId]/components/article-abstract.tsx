"use client"

import DOMPurify from "isomorphic-dompurify"

interface ArticleAbstractProps {
  abstract: string | null
}

export function ArticleAbstract({ abstract }: ArticleAbstractProps) {
  if (!abstract) return null

  const sanitized = DOMPurify.sanitize(abstract, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'b', 'i', 'sup', 'sub'],
    ALLOWED_ATTR: [],
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
