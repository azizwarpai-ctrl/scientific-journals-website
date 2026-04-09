"use client"

import DOMPurify from "dompurify"

interface ArticleAbstractProps {
  abstract: string | null
}

export function ArticleAbstract({ abstract }: ArticleAbstractProps) {
  if (!abstract) return null

  const sanitized = typeof window === 'undefined' ? abstract : DOMPurify.sanitize(abstract, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'b', 'i', 'sup', 'sub'],
    ALLOWED_ATTR: [],
  })

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground">Abstract</h3>
      <div 
        className="prose prose-base text-muted-foreground/90 max-w-none dark:prose-invert leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  )
}
