"use client"

import { Download, FileText, BarChart3, Quote } from "lucide-react"
import type { ArticleDetail } from "@/src/features/journals"
import { CitationBox } from "./citation-box"
import { ModalPdfViewer } from "./modal-pdf-viewer"

interface ArticleSidebarProps {
  article: ArticleDetail
}

export function ArticleSidebar({ article }: ArticleSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Primary Actions */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Full Text
        </h3>

        {article.pdfUrl ? (
          <ModalPdfViewer pdfUrl={article.pdfUrl} articleTitle={article.title || undefined} />
        ) : (
          <div className="p-4 rounded-lg bg-muted/40 border border-border/40 text-center">
            <p className="text-sm text-muted-foreground font-medium">PDF not available</p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Article Metrics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border border-border/30">
            <Quote className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-2xl font-bold text-foreground">{(article.citations || 0).toLocaleString()}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Quotes</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border border-border/30">
            <Download className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-2xl font-bold text-foreground">{(article.downloads || 0).toLocaleString()}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Downloads</span>
          </div>
        </div>
      </div>

      {/* Citation Box */}
      <CitationBox article={article} />
    </div>
  )
}
