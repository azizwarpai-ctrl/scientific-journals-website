"use client"

import { createPortal } from "react-dom"
import { FileText, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

import { deriveDirectUrl, getIframeSrc } from "./pdf/pdf-url-helper"
import { usePdfModal } from "./pdf/use-pdf-modal"
import { PdfModalOverlay } from "./pdf/pdf-modal-overlay"

interface ModalPdfViewerProps {
  pdfUrl: string | null
  pdfDirectUrl?: string | null
  /**
   * When true, ignore the direct OJS URL and load the PDF exclusively through
   * `/api/pdf-proxy`. Used for journals disabled in OJS (`enabled=0`).
   */
  pdfProxyOnly?: boolean
  /**
   * When true, the article is behind an OJS subscription wall.
   */
  isGatedAccess?: boolean
  articleTitle?: string
  triggerStyle?: "sidebar" | "card"
}

export function ModalPdfViewer({
  pdfUrl,
  pdfDirectUrl,
  pdfProxyOnly = false,
  isGatedAccess = false,
  articleTitle = "Document",
  triggerStyle = "sidebar",
}: ModalPdfViewerProps) {
  const {
    open,
    phase,
    attempt,
    panelRef,
    iframeRef,
    isMobile,
    openModal,
    closeModal,
    retry,
    handleIframeLoad,
  } = usePdfModal()

  // For OJS-disabled journals, we force the proxy route.
  // Otherwise, prefer the direct OJS URL to bypass server-side WAF issues.
  const directOjsUrl = pdfProxyOnly
    ? null
    : pdfDirectUrl || deriveDirectUrl(pdfUrl)
  
  const downloadUrl = directOjsUrl || pdfUrl
  const iframeSrc = getIframeSrc(directOjsUrl || pdfUrl)

  if (!isGatedAccess && !pdfUrl && !pdfDirectUrl) {
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

  const trigger = (
    <Button
      onClick={openModal}
      variant={triggerStyle === "sidebar" ? "default" : "ghost"}
      size={triggerStyle === "sidebar" ? "default" : "sm"}
      className={
        triggerStyle === "sidebar"
          ? "w-full font-bold h-12 shadow-sm relative overflow-hidden group rounded-xl"
          : "h-8 gap-2 text-primary hover:bg-primary/10 rounded-full px-4"
      }
    >
      {triggerStyle === "sidebar" && (
        <div className="absolute inset-0 bg-primary/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
      )}
      <span className="relative flex items-center gap-2">
        {triggerStyle === "sidebar" ? (
          <>
            <Maximize2 className="h-5 w-5" /> View PDF
          </>
        ) : (
          <>
            View PDF
            <Maximize2 className="h-3.5 w-3.5 opacity-70" />
          </>
        )}
      </span>
    </Button>
  )

  return (
    <>
      {trigger}
      {open && typeof document !== "undefined"
        ? createPortal(
            <PdfModalOverlay
              isOpen={open}
              phase={phase}
              attempt={attempt}
              isMobile={isMobile}
              isGatedAccess={isGatedAccess}
              articleTitle={articleTitle}
              downloadUrl={downloadUrl}
              iframeSrc={iframeSrc}
              panelRef={panelRef}
              iframeRef={iframeRef}
              onClose={closeModal}
              onRetry={retry}
              onIframeLoad={handleIframeLoad}
            />,
            document.body
          )
        : null}
    </>
  )
}
