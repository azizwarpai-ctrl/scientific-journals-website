"use client"

import { Download, FileText, BarChart3, Quote, Share2 } from "lucide-react"
import { useState } from "react"
import type { ArticleDetail } from "@/src/features/journals"
import { CitationBox } from "./citation-box"
import { ModalPdfViewer } from "./modal-pdf-viewer"

interface ArticleSidebarProps {
  article: ArticleDetail
}

export function ArticleSidebar({ article }: ArticleSidebarProps) {
  const [shared, setShared] = useState(false)

  const handleShare = async () => {
    if (typeof window === "undefined") return
    const url = window.location.href
    const nav = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>
    }
    try {
      if (typeof nav.share === "function") {
        await nav.share({
          title: article.title || "Article",
          text: article.title || "",
          url,
        })
        return
      }
      await nav.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      /* user aborted share or clipboard blocked */
    }
  }

  return (
    <div className="space-y-6">
      {/* Full Text */}
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Full Text
        </h3>

        {article.pdfUrl ? (
          <ModalPdfViewer
            pdfUrl={article.pdfUrl}
            pdfDirectUrl={article.pdfDirectUrl}
            pdfProxyOnly={article.pdfProxyOnly}
            articleTitle={article.title || undefined}
          />
        ) : (
          <div className="p-4 rounded-lg bg-muted/40 border border-border/40 text-center">
            <p className="text-sm text-muted-foreground font-medium">PDF not available</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="w-full h-10 rounded-lg text-sm font-semibold border border-border/50 bg-background hover:bg-muted/50 text-foreground/80 inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          {shared ? "Link copied" : "Share article"}
        </button>
      </div>

      {/* Metrics */}
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Article Metrics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<Quote className="h-4 w-4 text-muted-foreground" />}
            label="Quotes"
            value={article.citations || 0}
          />
          <MetricCard
            icon={<Download className="h-4 w-4 text-muted-foreground" />}
            label="Downloads"
            value={article.downloads || 0}
          />
        </div>
      </div>

      {/* Citation Box */}
      <CitationBox article={article} />
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: number
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30 border border-border/40">
      <div className="mb-2">{icon}</div>
      <span className="text-2xl font-bold text-foreground tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </span>
    </div>
  )
}
