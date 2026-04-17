"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Download, Quote } from "lucide-react"
import type { ArticleDetail } from "@/src/features/journals"
import {
  CITATION_FORMATS,
  citationToPlainText,
  generateCitation,
  type CitationFormat,
} from "@/src/features/journals/utils/citation-formatter"
import { Button } from "@/components/ui/button"

interface CitationBoxProps {
  article: ArticleDetail
}

export function CitationBox({ article }: CitationBoxProps) {
  const [format, setFormat] = useState<CitationFormat>("apa")
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const activeFormat = useMemo(
    () => CITATION_FORMATS.find((f) => f.id === format) ?? CITATION_FORMATS[0],
    [format]
  )

  const citationHtml = useMemo(
    () => generateCitation(article, format, { htmlPreview: true }),
    [article, format]
  )
  const citationPlain = useMemo(() => citationToPlainText(citationHtml), [citationHtml])

  const handleCopy = async () => {
    setCopyFailed(false)
    const richHtml = activeFormat.display === "prose" ? citationHtml : ""
    try {
      if (typeof window !== "undefined" && "ClipboardItem" in window && richHtml) {
        const item = new ClipboardItem({
          "text/plain": new Blob([citationPlain], { type: "text/plain" }),
          "text/html": new Blob([richHtml], { type: "text/html" }),
        })
        await navigator.clipboard.write([item])
      } else {
        await navigator.clipboard.writeText(citationPlain)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      try {
        await navigator.clipboard.writeText(citationPlain)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setCopyFailed(true)
        setTimeout(() => setCopyFailed(false), 3000)
      }
    }
  }

  const handleExport = () => {
    if (!activeFormat.fileExtension) return
    const body = generateCitation(article, format)
    const mime = activeFormat.fileExtension === "ris" ? "application/x-research-info-systems" : "text/plain"
    const blob = new Blob([body], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const year =
      article.year ||
      (article.datePublished ? new Date(article.datePublished).getFullYear() : "nd")
    const firstAuthor = (article.authors[0]?.familyName || "citation").replace(/\s+/g, "")
    const slug = `${firstAuthor}${year}`.replace(/[^a-zA-Z0-9_-]/g, "")

    const a = document.createElement("a")
    a.href = url
    a.download = `${slug || "citation"}.${activeFormat.fileExtension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <section
      aria-label="Cite this article"
      className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden"
    >
      <header className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50">
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Quote className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight">Cite this article</h3>
          <p className="text-[11px] text-muted-foreground font-medium">
            {activeFormat.description}
          </p>
        </div>
      </header>

      {/* Format selector — scrollable segmented control */}
      <div
        className="flex gap-1 px-3 py-2 bg-muted/30 border-b border-border/50 overflow-x-auto scrollbar-thin"
        role="tablist"
        aria-label="Citation format"
      >
        {CITATION_FORMATS.map((fmt) => {
          const active = fmt.id === format
          return (
            <button
              key={fmt.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={fmt.description}
              onClick={() => setFormat(fmt.id)}
              className={[
                "shrink-0 inline-flex items-center justify-center px-3 h-7 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                active
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60 border border-transparent",
              ].join(" ")}
            >
              {fmt.label}
            </button>
          )
        })}
      </div>

      {/* Citation preview */}
      <div className="p-5 space-y-4">
        {activeFormat.display === "prose" ? (
          <div
            className="text-[13px] leading-relaxed text-foreground/90 rounded-lg bg-muted/30 p-4 border border-border/40 [&_i]:italic"
            dangerouslySetInnerHTML={{ __html: citationHtml }}
          />
        ) : (
          <pre className="text-[12px] leading-relaxed text-foreground/90 rounded-lg bg-muted/40 p-4 border border-border/40 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto">
            {citationPlain}
          </pre>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-live="polite"
            className={[
              "flex-1 gap-2 transition-colors",
              copied
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                : "bg-transparent hover:bg-muted/50",
            ].join(" ")}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy citation"}
          </Button>
          {activeFormat.fileExtension && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              title={`Download .${activeFormat.fileExtension}`}
              className="gap-2 bg-transparent hover:bg-muted/50"
            >
              <Download className="h-4 w-4" />
              .{activeFormat.fileExtension}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
