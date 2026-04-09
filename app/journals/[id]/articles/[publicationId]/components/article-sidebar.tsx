"use client"

import { Download, FileText, BarChart3, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ArticleDetail } from "@/src/features/journals"
import { CitationBox } from "./citation-box"

interface ArticleSidebarProps {
  article: ArticleDetail
}

export function ArticleSidebar({ article }: ArticleSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Primary Actions */}
      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Access Full Text
        </h3>
        
        {article.pdfUrl ? (
          <Button 
            className="w-full font-bold h-12 shadow-sm relative overflow-hidden group" 
            asChild
          >
            <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer">
              <div className="absolute inset-0 bg-primary/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-2">
                <Download className="h-5 w-5" /> Download PDF
              </span>
            </a>
          </Button>
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
             <Eye className="h-5 w-5 text-muted-foreground mb-2" />
             <span className="text-2xl font-bold text-foreground">{(article.views || 0).toLocaleString()}</span>
             <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Views</span>
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
