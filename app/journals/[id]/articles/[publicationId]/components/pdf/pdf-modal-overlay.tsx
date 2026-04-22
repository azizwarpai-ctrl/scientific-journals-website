"use client"

import {
  FileText,
  Loader2,
  Download,
  ExternalLink,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RefObject } from "react"
import { Phase } from "./use-pdf-modal"
import { MobileView, GatedView, TimeoutView } from "./pdf-sub-views"

interface PdfModalOverlayProps {
  isOpen: boolean
  phase: Phase
  attempt: number
  isMobile: boolean
  isGatedAccess: boolean
  articleTitle: string
  downloadUrl: string | null
  iframeSrc: string
  panelRef: RefObject<HTMLDivElement | null>
  iframeRef: RefObject<HTMLIFrameElement | null>
  onClose: () => void
  onRetry: () => void
  onIframeLoad: () => void
}

export function PdfModalOverlay({
  isOpen,
  phase,
  attempt,
  isMobile,
  isGatedAccess,
  articleTitle,
  downloadUrl,
  iframeSrc,
  panelRef,
  iframeRef,
  onClose,
  onRetry,
  onIframeLoad,
}: PdfModalOverlayProps) {
  if (!isOpen) return null

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
          </div>

          {!isGatedAccess && downloadUrl && (
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
            onClick={onClose}
            aria-label="Close PDF viewer"
            className="ml-1 h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden bg-[#525659]">
          {/* Loading overlay */}
          {phase === "loading" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#1a1a1a] animate-in fade-in duration-200">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white/80">
                  Loading document…
                </p>
                <p className="text-xs text-white/40">
                  This may take a moment on first load
                </p>
              </div>
            </div>
          )}

          {/* Iframe */}
          {!isMobile && !isGatedAccess && iframeSrc && (
            <iframe
              ref={iframeRef}
              key={attempt}
              src={iframeSrc}
              title={`${articleTitle} PDF`}
              className={`w-full h-full border-none bg-[#525659] transition-opacity duration-300 ${
                phase === "loading" ? "opacity-0" : "opacity-100"
              }`}
              allow="fullscreen"
              onLoad={onIframeLoad}
            />
          )}

          {/* Sub-views */}
          {isMobile && !isGatedAccess && (
            <MobileView downloadUrl={downloadUrl} onRetry={onRetry} />
          )}

          {isGatedAccess && <GatedView articleTitle={articleTitle} />}

          {phase === "timeout" && !isMobile && !isGatedAccess && (
            <TimeoutView downloadUrl={downloadUrl} onRetry={onRetry} />
          )}
        </div>
      </div>
    </div>
  )
}
