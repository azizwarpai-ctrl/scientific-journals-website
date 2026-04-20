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
  /**
   * When true, ignore the direct OJS URL and load the PDF exclusively through
   * `/api/pdf-proxy`. Used for journals disabled in OJS (`enabled=0`) where the
   * direct URL would hit OJS's login wall. The proxy routes to the PHP bridge
   * on the OJS host, which reads the file straight off disk.
   */
  pdfProxyOnly?: boolean
  articleTitle?: string
  triggerStyle?: "sidebar" | "card"
}

/**
 * Phase flow:
 *  "loading"   → spinner + iframe rendering in background
 *  "ready"     → iframe visible, spinner hidden
 *  "timeout"   → iframe took too long — show fallback with download/new-tab
 */
type Phase = "loading" | "ready" | "timeout"

/**
 * PDF viewer strategy:
 *
 * The OJS server (submitmanager.com) sits behind SiteGround hosting, which
 * serves a JavaScript CAPTCHA challenge (`sg-captcha: challenge`) to every
 * server-to-server request. Our Next.js `/api/pdf-proxy` route runs on the
 * server and cannot execute JavaScript, so it ALWAYS receives a 202 HTML
 * challenge page instead of the PDF — regardless of URL pattern, API key,
 * headers, or User-Agent.
 *
 * The ONLY way to reach the PDF is via **real browser navigation**. The
 * browser's iframe CAN handle SiteGround's challenge because it executes
 * the JS meta-refresh, passes the check, gets the `sg` cookie, and then
 * the OJS download endpoint serves the PDF.
 *
 * Therefore: we skip all server-side probing and load the DIRECT OJS URL
 * (pdfDirectUrl) straight into an iframe. The browser handles everything.
 */
/**
 * If pdfDirectUrl is not provided, derive a direct OJS download URL from
 * the proxy URL's query parameters. This guarantees the iframe always loads
 * the OJS URL directly (browser handles SiteGround WAF) and never our
 * server-side proxy (which SiteGround blocks with a JS challenge).
 */
function deriveDirectUrl(proxyUrl: string | null): string | null {
  if (!proxyUrl || !proxyUrl.startsWith("/api/pdf-proxy")) return null
  const ojsBase = process.env.NEXT_PUBLIC_OJS_BASE_URL
  if (!ojsBase) return null
  try {
    const params = new URL(proxyUrl, "http://localhost").searchParams
    const journal = params.get("journal")
    const submissionId = params.get("submissionId")
    const galleyId = params.get("galleyId")
    if (!journal || !submissionId || !galleyId) return null
    const base = ojsBase.endsWith("/") ? ojsBase.slice(0, -1) : ojsBase
    return `${base}/index.php/${journal}/article/download/${submissionId}/${galleyId}?inline=1`
  } catch {
    return null
  }
}

export function ModalPdfViewer({
  pdfUrl,
  pdfDirectUrl,
  pdfProxyOnly = false,
  articleTitle = "Document",
  triggerStyle = "sidebar",
}: ModalPdfViewerProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("loading")
  const [attempt, setAttempt] = useState(0)
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // For OJS-disabled journals, the direct URL would hit OJS's login wall. Force
  // the proxy route (which fronts the PHP bridge on the OJS host) so the PDF
  // streams from disk regardless of OJS's public access policy.
  // Otherwise, prefer the direct OJS URL so the browser handles SiteGround's
  // WAF; derive it from the proxy URL's params when `pdfDirectUrl` is absent.
  const directOjsUrl = pdfProxyOnly ? null : (pdfDirectUrl || deriveDirectUrl(pdfUrl))
  const viewUrl = directOjsUrl || pdfUrl
  const downloadUrl = directOjsUrl || pdfUrl

  const [isMobile] = useState(() => {
    if (typeof navigator === "undefined") return false
    const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || ""
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
  })

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement
    setPhase("loading")
    setAttempt((n) => n + 1)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const retry = useCallback(() => {
    setPhase("loading")
    setAttempt((n) => n + 1)
  }, [])

  // Body scroll-lock + keyboard handling while open
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

  // Timeout: if the iframe hasn't signaled anything after 25s, show fallback.
  // The `onLoad` handler on the iframe will mark "ready" sooner if it loads.
  useEffect(() => {
    if (!open || phase !== "loading") return
    const timer = setTimeout(() => {
      setPhase("timeout")
    }, 25000)
    return () => clearTimeout(timer)
  }, [open, phase, attempt])

  // When the iframe fires `onLoad`, transition to "ready". This fires for
  // both successful PDF loads and SiteGround challenge redirect pages.
  // Either way, the browser is handling it — hide the spinner.
  const handleIframeLoad = useCallback(() => {
    setPhase("ready")
  }, [])

  if (!pdfUrl && !pdfDirectUrl) {
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

  // Build iframe src with PDF viewer hints
  const iframeSrc = viewUrl
    ? `${viewUrl}${viewUrl.includes("?") ? "&" : "#"}toolbar=1&navpanes=1&scrollbar=1&view=FitH`
    : ""

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

          {downloadUrl && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 gap-1.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20"
              >
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
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
                <a href={downloadUrl} download rel="noopener noreferrer">
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
          {/* Loading overlay — sits on top of iframe while loading */}
          {phase === "loading" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#1a1a1a] animate-in fade-in duration-200">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white/80">Loading document…</p>
                <p className="text-xs text-white/40">
                  This may take a moment on first load
                </p>
              </div>
            </div>
          )}

          {/* Iframe — always mounted when modal is open (not mobile) */}
          {!isMobile && iframeSrc && (
            <iframe
              ref={iframeRef}
              key={attempt}
              src={iframeSrc}
              title={`${articleTitle} PDF`}
              className={`w-full h-full border-none bg-[#525659] transition-opacity duration-300 ${
                phase === "loading" ? "opacity-0" : "opacity-100"
              }`}
              allow="fullscreen"
              onLoad={handleIframeLoad}
            />
          )}

          {/* Mobile fallback — download-oriented */}
          {isMobile && (
            <MobileView downloadUrl={downloadUrl} onRetry={retry} />
          )}

          {/* Timeout fallback */}
          {phase === "timeout" && !isMobile && (
            <TimeoutView downloadUrl={downloadUrl} onRetry={retry} />
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

function MobileView({
  downloadUrl,
  onRetry,
}: {
  downloadUrl: string | null
  onRetry: () => void
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center bg-[#1a1a1a]">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <FileText className="h-9 w-9 text-primary/60" />
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-bold text-white/90">View PDF</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          For the best experience on mobile, open the PDF in your browser or download it.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {downloadUrl && (
          <>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Browser
            </a>
            <a
              href={downloadUrl}
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

function TimeoutView({
  downloadUrl,
  onRetry,
}: {
  downloadUrl: string | null
  onRetry: () => void
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 p-8 text-center animate-in fade-in duration-300 bg-[#1a1a1a]">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <AlertCircle className="h-9 w-9 text-white/40" />
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-bold text-white/90">Taking too long</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          The document is taking longer than expected to load.
          Try opening it directly in a new tab.
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
        {downloadUrl && (
          <>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
            <a
              href={downloadUrl}
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
