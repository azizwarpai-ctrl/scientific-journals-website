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
}

export function ModalPdfViewer({ pdfUrl, articleTitle = "Document" }: ModalPdfViewerProps) {
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
        <Button className="w-full font-bold h-12 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative flex items-center gap-2">
            <Maximize className="h-5 w-5" /> View Full Text
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-foreground truncate pl-2 pt-1 opacity-90 text-[clamp(1rem,2vw,1.25rem)]">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{articleTitle}</span>
          </DialogTitle>
          <div className="flex items-center gap-3 pr-8">
            <Button size="sm" variant="outline" asChild className="gap-2 shrink-0">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </a>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-muted/10 w-full h-full p-2 lg:p-4">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/50 backdrop-blur-[2px]">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <FileText className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Document...</p>
            </div>
          )}
          
          <div className="w-full h-full rounded-md overflow-hidden ring-1 ring-border shadow-sm bg-white">
            <iframe
              src={pdfUrl}
              className={`w-full h-full border-none transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              title={`${articleTitle} PDF`}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
