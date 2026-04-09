"use client"

import { useState } from "react"
import { Check, Copy, Download } from "lucide-react"
import type { ArticleDetail } from "@/src/features/journals"
import { generateCitation, type CitationFormat } from "@/src/features/journals/utils/citation-formatter"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CitationBoxProps {
  article: ArticleDetail
}

export function CitationBox({ article }: CitationBoxProps) {
  const [format, setFormat] = useState<CitationFormat>("apa")
  const [copied, setCopied] = useState(false)

  const citationHtml = generateCitation(article, format)

  const handleCopy = async () => {
    try {
      // 1. Create plain text fallback (strip HTML tags)
      const plainText = citationHtml.replace(/<[^>]*>?/gm, '')
      
      // 2. Prepare rich and plain clipboard data
      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([citationHtml], { type: "text/html" }),
      })

      await navigator.clipboard.write([clipboardItem])
      
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy rich citation, falling back to basic:", err)
      // Fallback for older browsers
      try {
        const plainText = citationHtml.replace(/<[^>]*>?/gm, '')
        await navigator.clipboard.writeText(plainText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error("Complete clipboard exact failure", fallbackErr)
      }
    }
  }

  const handleExportBibtex = () => {
    const bibtex = generateCitation(article, "bibtex")
    // BibTeX shouldn't have HTML tags, but our engine doesn't inject any for bibtex mode.
    const blob = new Blob([bibtex], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const year = article.year || (article.datePublished ? new Date(article.datePublished).getFullYear() : "nd")
    const id = `${article.authors[0]?.familyName || 'Author'}${year}`.replace(/\s+/g, "")
    
    const a = document.createElement("a")
    a.href = url
    a.download = `${id}.bib`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-lg">How to Cite</h3>
      
      <Select value={format} onValueChange={(v) => setFormat(v as CitationFormat)}>
        <SelectTrigger className="w-full bg-muted/30">
          <SelectValue placeholder="Select citation format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apa">APA 7th Edition</SelectItem>
          <SelectItem value="mla">MLA 9th Edition</SelectItem>
          <SelectItem value="chicago">Chicago 17th Edition</SelectItem>
          <SelectItem value="bibtex">BibTeX</SelectItem>
        </SelectContent>
      </Select>

      <div 
        className="relative rounded-md bg-muted/40 p-4 font-mono text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap outline-none focus-within:ring-2 focus-within:ring-primary/20"
        dangerouslySetInnerHTML={{ __html: citationHtml }}
      />

      <div className="flex items-center gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopy}
          className="flex-1 gap-2 bg-transparent hover:bg-muted/50"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy HTML Citation"}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleExportBibtex}
          className="flex-1 gap-2 bg-transparent hover:bg-muted/50"
          title="Download BibTeX file"
        >
          <Download className="h-4 w-4" />
          Export .bib
        </Button>
      </div>
    </div>
  )
}
