"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
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

type Phase = "probing" | "rendering" | "error"

interface ProbeResult {
  ok: boolean
  contentType?: string
  status?: number
  message?: string
}

/**
 * Probe the PDF URL with a HEAD request (falls back to a ranged GET if HEAD
 * is unsupported). This lets us surface a clear error for upstream proxies
 * that respond 502/403 with an HTML body — which iframes would otherwise
 * render silently as a broken document.
 */
async function probePdf(url: string, signal: AbortSignal): Promise<ProbeResult> {
  const validate = (res: Response): ProbeResult => {
    const contentType = res.headers.get("content-type") || ""
    if (!res.ok) {
      return { ok: false, status: res.status, contentType, message: `Server returned ${res.status}` }
    }
    if (contentType && !/pdf|octet-stream/i.test(contentType)) {
      return { ok: false, status: res.status, contentType, message: "Upstream did not return a PDF" }
    }
    return { ok: true, status: res.status, contentType }
  }

  try {
    const headRes = await fetch(url, { method: "HEAD", signal, redirect: "follow" })
    // Some servers (or our proxy) don't implement HEAD — fall through to ranged GET
    if (headRes.status !== 405 && headRes.status !== 501) {
      return validate(headRes)
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err
    // Some CDNs reject HEAD at the network level — fall through to ranged GET
  }

  try {
    const getRes = await fetch(url, {
      method: "GET",
      signal,
      redirect: "follow",
      headers: { Range: "bytes=0-1023" },
    })
    return validate(getRes)
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err
    return { ok: false, message: "Network error while loading document" }
  }
}

export function ModalPdfViewer({
  pdfUrl,
  pdfDirectUrl,
  articleTitle = "Document",
  triggerStyle = "sidebar",
}: ModalPdfViewerProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("probing")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const directUrl = pdfDirectUrl || pdfUrl

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement
    setPhase("probing")
    setErrorMessage(null)
    setAttempt((n) => n + 1)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const retry = useCallback(() => {
    setPhase("probing")
    setErrorMessage(null)
    setAttempt((n) => n + 1)
  }, [])

  // Body scroll-lock + focus management while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const panel = panelRef.current
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )
    requestAnimationFrame(() => focusables?.[0]?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        closeModal()
        return
      }
      if (e.key === "Tab" && panel) {
        const items = panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
      triggerRef.current?.focus()
    }
  }, [open, closeModal])

  // Probe the PDF whenever the modal opens or user retries
  useEffect(() => {
    if (!open || !pdfUrl || phase !== "probing") return
    const controller = new AbortController()
    let cancelled = false
    ;(async () => {
      try {
        const result = await probePdf(pdfUrl, controller.signal)
        if (cancelled) return
        if (result.ok) {
          setPhase("rendering")
        } else {
          setErrorMessage(result.message || "Unable to display PDF")
          setPhase("error")
        }
      } catch (err) {
        if (cancelled || (err as Error).name === "AbortError") return
        setErrorMessage("Network error while loading document")
        setPhase("error")
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [open, pdfUrl, phase, attempt])

  if (!pdfUrl) {
    if (triggerStyle === "card") return null
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
        className="h-8 gap-2 text-primary hover:bg-primary/10 rounded-full px-4"
      >
        <span className="flex items-center gap-1.5">
          View PDF
          <Maximize2 className="h-3.5 w-3.5 opacity-70" />
        </span>
      </Button>
    )

  const overlay = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`PDF viewer: ${articleTitle}`}
    >
      <button
        type="button"
        aria-label="Close overlay"
        onClick={closeModal}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md cursor-default animate-in fade-in duration-150"
      />

      <div
        ref={panelRef}
        className="relative z-10 flex flex-col w-full h-full md:h-[96vh] md:my-[2vh] md:mx-4 md:max-w-[1440px] md:rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a] shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-[0.98] duration-200"
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-[#111111] shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
            <div className="p-1.5 rounded-md bg-primary/20 shrink-0">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="truncate text-sm font-semibold text-white/90 leading-tight" title={articleTitle}>
              {articleTitle}
            </span>
          </div>

          {directUrl && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20"
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
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/30 hover:border-primary"
              >
                <a href={directUrl} download rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={closeModal}
            aria-label="Close PDF viewer"
            className="ml-1 h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden bg-[#525659]">
          {phase === "probing" && (
            <LoadingView />
          )}
          {phase === "rendering" && (
            <iframe
              key={attempt}
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
              title={`${articleTitle} PDF`}
              className="w-full h-full border-none bg-[#525659]"
              allow="fullscreen"
            />
          )}
          {phase === "error" && (
            <FallbackView directUrl={directUrl} message={errorMessage} onRetry={retry} />
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {trigger}
      {overlay && typeof document !== "undefined"
        ? createPortal(overlay, document.body)
        : null}
    </>
  )
}

function LoadingView() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1a1a1a]">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Loader2 className="h-7 w-7 text-primary animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-white/80">Loading document…</p>
        <p className="text-xs text-white/40">Verifying the file before rendering</p>
      </div>
    </div>
  )
}

interface FallbackViewProps {
  directUrl: string | null | undefined
  message: string | null
  onRetry: () => void
}

function FallbackView({ directUrl, message, onRetry }: FallbackViewProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center animate-in fade-in duration-300 bg-[#1a1a1a]">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <AlertCircle className="h-9 w-9 text-white/40" />
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-bold text-white/90">Unable to Display PDF</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          {message ||
            "The document may require authentication or is blocked by the upstream server."}{" "}
          Try opening it in a new tab or downloading it directly.
        </p>
      </div>

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
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
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
