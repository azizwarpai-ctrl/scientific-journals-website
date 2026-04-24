"use client"

import {
  FileText,
  Loader2,
  Download,
  ExternalLink,
  X,
  AlertTriangle,
  Lock,
  RefreshCw,
  Unlock,
} from "lucide-react"
import { RefObject } from "react"
import { Button } from "@/components/ui/button"
import type { PdfErrorCode, PdfProbeState } from "./use-pdf-modal"

interface PdfModalOverlayProps {
  articleTitle: string
  downloadUrl: string
  iframeSrc: string
  isMobile: boolean
  isOpenAccess?: boolean
  loaded: boolean
  loadTimedOut: boolean
  probeState: PdfProbeState
  errorCode: PdfErrorCode | null
  panelRef: RefObject<HTMLDivElement | null>
  iframeRef: RefObject<HTMLIFrameElement | null>
  onClose: () => void
  onIframeLoad: () => void
  onIframeError: () => void
  onRetry: () => void
}

interface ErrorCopy {
  icon: typeof Lock
  title: string
  description: string
  tone: "warn" | "error"
}

function errorCopyFor(code: PdfErrorCode | null): ErrorCopy {
  switch (code) {
    case "AUTH_REQUIRED":
      return {
        icon: Lock,
        title: "Access restricted",
        description: "The source server marked this file as restricted. Try opening it in a new tab from the original journal.",
        tone: "warn",
      }
    case "FILE_NOT_FOUND":
      return {
        icon: AlertTriangle,
        title: "PDF not found",
        description: "The file is no longer available at the source. Contact the editorial team if this persists.",
        tone: "error",
      }
    case "TIMEOUT":
      return {
        icon: AlertTriangle,
        title: "Source took too long to respond",
        description: "The journal server didn't reply in time. Retry, or open the PDF in a new tab.",
        tone: "warn",
      }
    case "NETWORK_ERROR":
      return {
        icon: AlertTriangle,
        title: "Network error",
        description: "We couldn't reach the PDF. Check your connection and retry.",
        tone: "warn",
      }
    case "UPSTREAM_ERROR":
    case "INVALID_RESPONSE":
      return {
        icon: AlertTriangle,
        title: "PDF temporarily unavailable",
        description: "The source returned an unexpected response. Retry, or open it in a new tab.",
        tone: "warn",
      }
    default:
      return {
        icon: AlertTriangle,
        title: "Could not load the PDF",
        description: "Something went wrong while fetching the file. Retry, or open it in a new tab.",
        tone: "warn",
      }
  }
}

export function PdfModalOverlay({
  articleTitle,
  downloadUrl,
  iframeSrc,
  isMobile,
  isOpenAccess,
  loaded,
  loadTimedOut,
  probeState,
  errorCode,
  panelRef,
  iframeRef,
  onClose,
  onIframeLoad,
  onIframeError,
  onRetry,
}: PdfModalOverlayProps) {
  const hasError = probeState === "error"
  const showSpinner = !hasError && !isMobile && (probeState !== "ready" || !loaded)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`PDF viewer: ${articleTitle}`}
    >
      <button
        type="button"
        aria-label="Close overlay"
        onClick={onClose}
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
            <span
              className="truncate text-sm font-semibold text-white/90 leading-tight"
              title={articleTitle}
            >
              {articleTitle}
            </span>
            {isOpenAccess && (
              <span
                className="hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 shrink-0"
                title="Open Access"
              >
                <Unlock className="h-3 w-3" />
                Open Access
              </span>
            )}
          </div>

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
              <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close PDF viewer"
            className="ml-1 h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 relative overflow-hidden bg-[#525659]"
          aria-busy={showSpinner}
          role="region"
          aria-label="PDF document"
        >
          <div role="status" aria-live="polite" className="sr-only">
            {hasError
              ? errorCopyFor(errorCode).title
              : probeState === "probing"
              ? "Preparing document"
              : loaded
              ? "Document loaded"
              : "Loading document"}
          </div>

          {isMobile ? (
            <MobileFallback downloadUrl={downloadUrl} />
          ) : hasError ? (
            <ErrorState errorCode={errorCode} downloadUrl={downloadUrl} onRetry={onRetry} />
          ) : (
            <>
              {showSpinner && (
                <LoadingState probing={probeState === "probing"} loadTimedOut={loadTimedOut} downloadUrl={downloadUrl} />
              )}
              {probeState === "ready" && (
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  title={`${articleTitle} PDF`}
                  className={`w-full h-full border-none bg-[#525659] transition-opacity duration-300 ${
                    loaded ? "opacity-100" : "opacity-0"
                  }`}
                  allow="fullscreen"
                  aria-hidden={!loaded}
                  onLoad={onIframeLoad}
                  onError={onIframeError}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface LoadingStateProps {
  probing: boolean
  loadTimedOut: boolean
  downloadUrl: string
}

function LoadingState({ probing, loadTimedOut, downloadUrl }: LoadingStateProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#1a1a1a] animate-in fade-in duration-200">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Loader2 className="h-7 w-7 text-primary animate-spin" />
      </div>
      <p className="text-sm font-semibold text-white/80">
        {probing ? "Preparing document…" : "Loading document…"}
      </p>
      {loadTimedOut && (
        <p className="text-xs text-white/50 max-w-xs text-center">
          Taking longer than expected.{" "}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/70"
          >
            Open in a new tab
          </a>{" "}
          or download.
        </p>
      )}
    </div>
  )
}

interface ErrorStateProps {
  errorCode: PdfErrorCode | null
  downloadUrl: string
  onRetry: () => void
}

function ErrorState({ errorCode, downloadUrl, onRetry }: ErrorStateProps) {
  const copy = errorCopyFor(errorCode)
  const Icon = copy.icon
  const accent =
    copy.tone === "error"
      ? "bg-rose-500/10 border-rose-400/30 text-rose-300"
      : "bg-amber-500/10 border-amber-400/30 text-amber-300"
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center bg-[#1a1a1a]">
      <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${accent}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-base font-bold text-white/90">{copy.title}</h3>
        <p className="text-sm text-white/60 leading-relaxed">{copy.description}</p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white/90 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold bg-primary/80 hover:bg-primary text-white border border-primary/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <ExternalLink className="h-4 w-4" />
          Open in new tab
        </a>
      </div>
    </div>
  )
}

function MobileFallback({ downloadUrl }: { downloadUrl: string }) {
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
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold bg-primary/80 hover:bg-primary text-white border border-primary/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>
    </div>
  )
}
