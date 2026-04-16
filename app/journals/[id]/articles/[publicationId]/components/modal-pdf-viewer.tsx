"use client"

import { useState, useEffect, useRef } from "react"
import { FileText, Loader2, Download, Maximize, AlertCircle, RefreshCcw } from "lucide-react"
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
  pdfDirectUrl?: string | null
  articleTitle?: string
  triggerStyle?: "sidebar" | "card"
}

export function ModalPdfViewer({ pdfUrl, pdfDirectUrl, articleTitle = "Document", triggerStyle = "sidebar" }: ModalPdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(true)

  const directUrl = pdfDirectUrl || pdfUrl

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const handleRetry = () => {
    setHasError(false)
    isLoadingRef.current = true
    setIsLoading(true)
  }

  useEffect(() => {
    if (open && pdfUrl) {
      requestAnimationFrame(() => {
        isLoadingRef.current = true
        setIsLoading(true)
        setHasError(false)
      })

      // Fail-safe timeout
      clearTimer()
      timeoutRef.current = setTimeout(() => {
        if (isLoadingRef.current) {
          isLoadingRef.current = false
          setIsLoading(false)
          setHasError(true)
        }
      }, 15000)

      // Pre-flight check to see if the PDF actually exists and isn't an HTML redirect
      fetch(pdfUrl, { method: 'HEAD' })
        .then(res => {
          if (!res.ok || (res.headers.get("content-type") && res.headers.get("content-type")?.includes("text/html"))) {
            throw new Error(`Upstream returned ${res.status}`)
          }
          // The object/iframe will now take over loading
        })
        .catch(err => {
          console.error("[ModalPdfViewer] Pre-flight failed:", err);
          if (isLoadingRef.current) {
             isLoadingRef.current = false
             setIsLoading(false)
             setHasError(true)
             clearTimer()
          }
        })
    }

    return () => clearTimer()
  }, [pdfUrl, open])

  const handleLoad = () => {
    isLoadingRef.current = false
    setIsLoading(false)
    setHasError(false)
    clearTimer()
  }

  const handleError = () => {
    isLoadingRef.current = false
    setIsLoading(false)
    setHasError(true)
    clearTimer()
  }

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
              <Maximize className="h-5 w-5" /> View PDF
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
      
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/80 backdrop-blur-md border border-border/50 shadow-2xl outline-none">
        {/* Sticky Header */}
        <DialogHeader className="p-3 sm:p-4 border-b border-border/40 bg-muted/40 flex flex-row items-center justify-between sticky top-0 z-50">
          <DialogTitle className="flex items-center gap-2 text-foreground truncate pl-2 pt-1 font-bold tracking-tight text-[clamp(1rem,1.5vw,1.15rem)]">
            <FileText className="h-5 w-5 text-primary shrink-0 opacity-80" />
            <span className="truncate">{articleTitle}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 sm:gap-3 pr-2 sm:pr-8">
             {directUrl && (
                <>
                  <Button size="sm" variant="secondary" asChild className="gap-2 shrink-0 h-8 sm:h-9 rounded-full bg-background hover:bg-muted/80 shadow-sm border border-border/40">
                    <a href={directUrl} target="_blank" rel="noopener noreferrer">
                      <Maximize className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">New Tab</span>
                    </a>
                  </Button>
                  <Button size="sm" variant="default" asChild className="gap-2 shrink-0 h-8 sm:h-9 rounded-full shadow-sm">
                    <a href={directUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Download</span>
                    </a>
                  </Button>
                </>
             )}
          </div>
        </DialogHeader>

        <div className="flex-1 relative w-full h-full p-0 flex flex-col items-center justify-center bg-transparent">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/60 backdrop-blur-sm">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <FileText className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70" />
              </div>
              <p className="text-sm font-bold tracking-wide uppercase text-muted-foreground animate-pulse">Loading Document...</p>
            </div>
          )}

          {hasError ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center animate-in fade-in zoom-in duration-300">
               <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                 <AlertCircle className="h-8 w-8 text-destructive" />
               </div>
               <div className="space-y-1">
                 <h3 className="text-lg font-bold text-foreground">Unable to load PDF</h3>
                 <p className="text-sm text-muted-foreground max-w-[300px]">
                   The document requires authentication or is currently suppressed by the upstream server.
                 </p>
               </div>
               <div className="flex gap-2 mt-2">
                 <Button onClick={handleRetry} variant="outline" className="gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                   <RefreshCcw className="h-4 w-4" /> Try Again
                 </Button>
                 {directUrl && (
                   <Button asChild variant="default" className="gap-2 rounded-full">
                     <a href={directUrl} target="_blank" rel="noopener noreferrer">
                       <Download className="h-4 w-4" /> Download Directly
                     </a>
                   </Button>
                 )}
               </div>
            </div>
          ) : (
            <div className={`w-full h-full overflow-hidden transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full border-none"
                onLoad={handleLoad}
                onError={handleError}
              >
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-none bg-white"
                  title={`${articleTitle} PDF`}
                  onLoad={handleLoad}
                  style={{ backgroundColor: 'white' }}
                />
              </object>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
