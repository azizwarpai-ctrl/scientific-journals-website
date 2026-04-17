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
  const [renderMethod, setRenderMethod] = useState<RenderMethod>("object")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const directUrl = pdfDirectUrl || pdfUrl

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
    clearTimer()
  }, [clearTimer])

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement
    setOpen(true)
    setIsLoading(true)
    setRenderMethod("object")
    isLoadingRef.current = true
  }, [])

  // Stable fallback handler used by IframeFallback.onFallback in both usages
  const handleFallbackFromIframe = useCallback(() => {
    clearTimer()
    isLoadingRef.current = false
    setIsLoading(false)
    setRenderMethod("fallback")
  }, [clearTimer])

  const handleObjectError = useCallback(() => {
    clearTimer()
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
  }, [clearTimer])

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current

    // Focus management — move focus into dialog, restore on close
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const getFocusable = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelectors)) : []

    // Move focus to first focusable element (close button) when dialog opens
    requestAnimationFrame(() => {
      const focusable = getFocusable()
      focusable[0]?.focus()
    })

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal()
        return
      }

      // Tab trap
      if (e.key === "Tab") {
        const focusable = getFocusable()
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"

    // 15s fail-safe: attempt iframe before final fallback (preserves cascade)
    clearTimer()
    timeoutRef.current = setTimeout(() => {
      if (isLoadingRef.current) {
        handleObjectError()
      }
    }, 15000)

    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
      clearTimer()
      // Restore focus to the element that triggered the modal
      triggerRef.current?.focus()
    }
  }, [open, closeModal, clearTimer, handleObjectError])

  const handleLoad = useCallback(() => {
    isLoadingRef.current = false
    clearTimer()
    setIsLoading(false)
  }, [clearTimer])

  const handleIframeLoad = useCallback(() => {
    isLoadingRef.current = false
    clearTimer()
    setIsLoading(false)
  }, [clearTimer])

  const handleRetry = useCallback(() => {
    setRenderMethod("object")
    setIsLoading(true)
    isLoadingRef.current = true
    clearTimer()
    timeoutRef.current = setTimeout(() => {
      if (isLoadingRef.current) {
        handleObjectError()
      }
    }, 15000)
  }, [clearTimer, handleObjectError])

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
          className="fixed inset-0 z-[9999] flex items-start justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`PDF viewer: ${articleTitle}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <div
            ref={panelRef}
            className="relative z-10 flex flex-col w-full h-full max-w-[1440px] md:h-[98vh] md:mt-[1vh] md:rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)] border border-white/[0.08] bg-[#1a1a1a] animate-in fade-in zoom-in-[0.97] duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.08] bg-[#111111] shrink-0">
              {/* File icon + title */}
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                <div className="p-1.5 rounded-md bg-primary/15 shrink-0">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="truncate text-sm font-semibold text-white/90 leading-tight">
                  {articleTitle}
                </span>
              </div>

              {/* Action buttons */}
              {directUrl && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <a href={directUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">New Tab</span>
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/30 hover:border-primary transition-all"
                  >
                    {/* No target="_blank": download attribute requires same-origin navigation */}
                    <a href={directUrl} download rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </Button>
                </div>
              )}

              {/* Close */}
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close PDF viewer"
                className="ml-1 h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── PDF content area ── */}
            <div className="flex-1 relative overflow-hidden bg-[#525659]">
              {/* Loading overlay — hidden once fallback is shown */}
              {isLoading && renderMethod !== "fallback" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-[#1a1a1a]">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Loader2 className="h-7 w-7 text-primary animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-white/80">Loading document…</p>
                    <p className="text-xs text-white/40">This may take a moment</p>
                  </div>
                </div>
              )}

              {/* object renderer — most compatible, native PDF plugin */}
              {renderMethod === "object" && (
                <div className="w-full h-full" style={{ opacity: isLoading ? 0 : 1 }}>
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full h-full border-none"
                    onLoad={handleLoad}
                    onError={handleObjectError}
                    aria-label={`${articleTitle} PDF document`}
                  >
                    {/* Trigger iframe fallback when object tag is unsupported */}
                    <IframeFallback
                      pdfUrl={pdfUrl}
                      articleTitle={articleTitle}
                      onLoad={handleIframeLoad}
                      onFallback={handleFallbackFromIframe}
                    />
                  </object>
                </div>
              )}

              {/* iframe renderer — explicit fallback */}
              {renderMethod === "iframe" && (
                <div className="w-full h-full" style={{ opacity: isLoading ? 0 : 1 }}>
                  <IframeFallback
                    pdfUrl={pdfUrl}
                    articleTitle={articleTitle}
                    onLoad={handleIframeLoad}
                    onFallback={handleFallbackFromIframe}
                  />
                </div>
              )}

              {/* Final fallback */}
              {renderMethod === "fallback" && (
                <FallbackView
                  directUrl={directUrl}
                  onRetry={handleRetry}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Iframe sub-component ─────────────────────────────────────────────

interface IframeFallbackProps {
  pdfUrl: string
  articleTitle: string
  onLoad: () => void
  onFallback: () => void
}

function IframeFallback({ pdfUrl, articleTitle, onLoad, onFallback }: IframeFallbackProps) {
  const src = `${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`
  return (
    <iframe
      src={src}
      className="w-full h-full border-none bg-[#525659]"
      title={`${articleTitle} PDF`}
      onLoad={onLoad}
      onError={onFallback}
      allow="fullscreen"
    />
  )
}

// ── Fallback view ────────────────────────────────────────────────────

interface FallbackViewProps {
  directUrl: string | null | undefined
  onRetry: () => void
}

function FallbackView({ directUrl, onRetry }: FallbackViewProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center animate-in fade-in duration-300">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <AlertCircle className="h-9 w-9 text-white/30" />
      </div>

      {/* Copy */}
      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-bold text-white/90">Unable to Display PDF</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          The document may require authentication or is blocked by the upstream server.
          Try opening it in a new tab or downloading directly.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <RefreshCcw className="h-4 w-4" />
          Try Again
        </button>
        {directUrl && (
          <>
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
            {/* No target="_blank": download attribute requires same-origin navigation */}
            <a
              href={directUrl}
              download
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold bg-primary/80 hover:bg-primary text-white border border-primary/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </>
        )}
      </div>
    </div>
  )
}
