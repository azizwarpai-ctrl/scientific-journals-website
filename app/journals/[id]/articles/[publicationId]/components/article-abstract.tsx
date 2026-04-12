"use client"

interface ArticleAbstractProps {
  abstract: string | null
}

export function ArticleAbstract({ abstract }: ArticleAbstractProps) {
  if (!abstract) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Abstract</h3>
      <div 
        className="text-[13px] leading-relaxed text-muted-foreground/90 max-w-none prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-li:my-1"
        dangerouslySetInnerHTML={{ __html: abstract }}
      />
    </div>
  )
}
