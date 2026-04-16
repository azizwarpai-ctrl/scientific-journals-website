"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  FileText,
  Loader2,
  Download,
  ExternalLink,
  X,
  AlertCircle,
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ModalPdfViewerProps {
  pdfUrl: string | null
  pdfDirectUrl?: string | null
  articleTitle?: string
  triggerStyle?: "sidebar" | "card"
}

type RenderMethod = "object" | "iframe" | "fallback"

export function ModalPdfViewer({
  pdfUrl,
  pdfDirectUrl,
  articleTitle = "Document",
  triggerStyle = "sidebar",
}: ModalPdfViewerProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [renderMethod, setRenderMethod] = useState<RenderMethod>("object")
  const [zoom, setZoom] = useState(100)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(true)

  const directUrl = pdfDirectUrl || pdfUrl

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const openModal = useCallback(() => {
    setOpen(true)
    setIsLoading(true)
    setHasError(false)
    setRenderMethod("object")
    setZoom(100)
    isLoadingRef.current = true
  }, [])

  // ESC key + body scroll lock
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"

    // 15-second fail-safe
    clearTimer()
    timeoutRef.current = setTimeout(() => {
      if (isLoadingRef.current) {
        isLoadingRef.current = false
        setIsLoading(false)
        setHasError(true)
      }
    }, 15000)

    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
      clearTimer()
    }
  }, [open, closeModal, clearTimer])

  const handleLoad = useCallback(() => {
    isLoadingRef.current = false
    setIsLoading(false)
    setHasError(false)
    clearTimer()
  }, [clearTimer])

  const handleError = useCallback(() => {
    clearTimer()
    if (renderMethod === "object") {
      setRenderMethod("iframe")
      setIsLoading(true)
      isLoadingRef.current = true
      timeoutRef.current = setTimeout(() => {
        if (isLoadingRef.current) {
          isLoadingRef.current = false
          setIsLoading(false)
          setRenderMethod("fallback")
        }
      }, 10000)
    } else {
      isLoadingRef.current = false
      setIsLoading(false)
      setRenderMethod("fallback")
    }
  }, [renderMethod, clearTimer])

  const handleRetry = useCallback(() => {
    setHasError(false)
    setRenderMethod("object")
    setIsLoading(true)
    isLoadingRef.current = true
    clearTimer()
    timeoutRef.current = setTimeout(() => {
      if (isLoadingRef.current) {
        isLoadingRef.current = false
        setIsLoading(false)
        setHasError(true)
      }
    }, 15000)
  }, [clearTimer])

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/20 border border-dashed border-border/50 rounded-xl">
        <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-muted-foreground text-center">
          PDF not available for this article.
        </p>
      </div>
    )
  }

  const trigger =
    triggerStyle === "sidebar" ? (
      <Button
        onClick={openModal}
        className="w-full font-bold h-12 shadow-sm relative overflow-hidden group rounded-xl"
      >
        <div className="absolute inset-0 bg-primary/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
        <span className="relative flex items-center gap-2">
          <Maximize2 className="h-5 w-5" /> View PDF
        </span>
      </Button>
    ) : (
      <Button
        onClick={openModal}
        variant="ghost"
        size="sm"
        className="h-8 gap-2 text-primary hover:bg-primary/10 rounded-full px-4 -mr-2"
      >
        <span className="flex items-center gap-1.5">
          View PDF
          <Maximize2 className="h-3.5 w-3.5 opacity-70" />
        </span>
      </Button>
    )

  return (
    <>
      {trigger}

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`PDF viewer: ${articleTitle}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Modal container */}
          <div
            className="relative z-10 flex flex-col w-full max-w-[1400px] h-[96vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-background animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Sticky toolbar ── */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0">
              <FileText className="h-4 w-4 text-primary shrink-0 opacity-80" />
              <span className="flex-1 truncate text-sm font-semibold text-foreground mr-2">
                {articleTitle}
              </span>

              {/* Zoom controls */}
              <div className="hidden sm:flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground w-10 text-center select-none">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setZoom((z) => Math.min(200, z + 10))}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Action buttons */}
              {directUrl && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 rounded-full text-xs font-semibold border-border/60"
                  >
                    <a href={directUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      <span className="hidden sm:inline">New Tab</span>
                    </a>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 rounded-full text-xs font-semibold"
                  >
                    <a href={directUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-3 w-3" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </Button>
                </div>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="h-8 w-8 rounded-full ml-1 text-muted-foreground hover:text-foreground hover:bg-destructive/10 shrink-0"
                aria-label="Close PDF viewer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* ── PDF content area ── */}
            <div className="flex-1 relative overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/70 backdrop-blur-sm">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <FileText className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70" />
                  </div>
                  <p className="text-sm font-bold tracking-wide uppercase text-muted-foreground animate-pulse">
                    Loading Document…
                  </p>
                </div>
              )}

              {/* object renderer */}
              {renderMethod === "object" && !hasError && (
                <div
                  className="w-full h-full transition-opacity duration-500"
                  style={{ opacity: isLoading ? 0 : 1 }}
                >
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full h-full border-none"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                    onLoad={handleLoad}
                    onError={handleError}
                  >
                    <span />
                  </object>
                </div>
              )}

              {/* iframe renderer */}
              {renderMethod === "iframe" && !hasError && (
                <div
                  className="w-full h-full transition-opacity duration-500"
                  style={{ opacity: isLoading ? 0 : 1 }}
                >
                  <iframe
                    src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-full border-none bg-white"
                    title={`${articleTitle} PDF`}
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                    onLoad={handleLoad}
                    onError={handleError}
                  />
                </div>
              )}

              {/* Final fallback */}
              {(renderMethod === "fallback" || hasError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-destructive/70" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h3 className="text-xl font-bold text-foreground">Unable to Display PDF</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The document may require authentication or is blocked by the upstream
                      server. Try opening it in a new tab or downloading directly.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={handleRetry} variant="outline" className="gap-2 rounded-full">
                      <RefreshCcw className="h-4 w-4" />
                      Try Again
                    </Button>
                    {directUrl && (
                      <>
                        <Button asChild variant="outline" className="gap-2 rounded-full">
                          <a href={directUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Open in New Tab
                          </a>
                        </Button>
                        <Button asChild variant="default" className="gap-2 rounded-full">
                          <a href={directUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                            Download PDF
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
