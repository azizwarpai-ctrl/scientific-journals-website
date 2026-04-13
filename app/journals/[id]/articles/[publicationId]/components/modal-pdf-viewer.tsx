"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, Download, Maximize } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ModalPdfViewerProps {
  pdfUrl: string | null
  articleTitle?: string
  triggerStyle?: "sidebar" | "card"
}

export function ModalPdfViewer({ pdfUrl, articleTitle = "Document", triggerStyle = "sidebar" }: ModalPdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)

  // Reset loading state whenever the PDF URL changes or modal is re-opened
  useEffect(() => {
    if (open) {
      setIsLoading(true)
    }
  }, [pdfUrl, open])

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/20 border border-dashed border-border/50 rounded-xl">
        <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-muted-foreground text-center">PDF not available for this article.</p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerStyle === "sidebar" ? (
          <Button className="w-full font-bold h-12 shadow-sm relative overflow-hidden group rounded-xl">
            <div className="absolute inset-0 bg-primary/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2">
              <Maximize className="h-5 w-5" /> View Full Text
            </span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-primary hover:bg-primary/10 rounded-full px-4 -mr-2">
            <span className="flex items-center gap-1.5 focus:outline-none">
              View PDF
              <Maximize className="h-3.5 w-3.5 opacity-70" />
            </span>
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl outline-none">
        {/* Sticky Header styled like the new premium search bar */}
        <DialogHeader className="p-3 sm:p-4 border-b border-border/40 bg-muted/40 flex flex-row items-center justify-between sticky top-0 z-50">
          <DialogTitle className="flex items-center gap-2 text-foreground truncate pl-2 pt-1 font-bold tracking-tight text-[clamp(1rem,1.5vw,1.15rem)]">
            <FileText className="h-5 w-5 text-primary shrink-0 opacity-80" />
            <span className="truncate">{articleTitle}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 sm:gap-3 pr-2 sm:pr-8">
            <Button size="sm" variant="secondary" asChild className="gap-2 shrink-0 h-8 sm:h-9 rounded-full bg-background hover:bg-muted/80 shadow-sm border border-border/40">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Maximize className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">New Tab</span>
              </a>
            </Button>
            <Button size="sm" variant="default" asChild className="gap-2 shrink-0 h-8 sm:h-9 rounded-full shadow-sm">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Download</span>
              </a>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative w-full h-full p-0">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/60 backdrop-blur-md rounded-b-2xl">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <FileText className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70" />
              </div>
              <p className="text-sm font-bold tracking-wide uppercase text-muted-foreground animate-pulse">Loading Document...</p>
            </div>
          )}
          
          <div className="w-full h-full overflow-hidden bg-white/50 dark:bg-white/5 rounded-b-2xl">
            <iframe
              src={pdfUrl}
              className={`w-full h-full border-none transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'} rounded-b-2xl`}
              title={`${articleTitle} PDF`}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
