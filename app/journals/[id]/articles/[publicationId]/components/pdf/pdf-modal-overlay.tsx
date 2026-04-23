"use client"

import {
  FileText,
  Loader2,
  Download,
  ExternalLink,
  X,
} from "lucide-react"
import { RefObject } from "react"
import { Button } from "@/components/ui/button"

interface PdfModalOverlayProps {
  articleTitle: string
  downloadUrl: string
  iframeSrc: string
  isMobile: boolean
  loaded: boolean
  panelRef: RefObject<HTMLDivElement | null>
  iframeRef: RefObject<HTMLIFrameElement | null>
  onClose: () => void
  onIframeLoad: () => void
}

export function PdfModalOverlay({
  articleTitle,
  downloadUrl,
  iframeSrc,
  isMobile,
  loaded,
  panelRef,
  iframeRef,
  onClose,
  onIframeLoad,
}: PdfModalOverlayProps) {
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
          {isMobile ? (
            <MobileFallback downloadUrl={downloadUrl} />
          ) : (
            <>
              {!loaded && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#1a1a1a] animate-in fade-in duration-200">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-white/80">
                    Loading document…
                  </p>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title={`${articleTitle} PDF`}
                className={`w-full h-full border-none bg-[#525659] transition-opacity duration-300 ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
                allow="fullscreen"
                onLoad={onIframeLoad}
              />
            </>
          )}
        </div>
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
