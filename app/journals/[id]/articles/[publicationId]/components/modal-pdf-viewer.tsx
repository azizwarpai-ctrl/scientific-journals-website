"use client"

import { createPortal } from "react-dom"
import { FileText, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

import { usePdfModal } from "./pdf/use-pdf-modal"
import { PdfModalOverlay } from "./pdf/pdf-modal-overlay"

interface ModalPdfViewerProps {
  /**
   * URL the embedded iframe loads. For local OJS galleys this MUST be the
   * `/api/pdf-proxy?…` URL, because OJS serves
   * `Content-Disposition: attachment` on `/article/download/…` which would
   * trigger a browser download instead of inline rendering. The proxy
   * rewrites the header to `inline`.
   */
  pdfUrl: string | null
  /**
   * Clean shareable OJS download URL, used ONLY by the explicit "Download"
   * button — OJS sends `Content-Disposition: attachment` on this URL so the
   * browser saves the file. The "Open in new tab" / "Open in Browser" / "New
   * Tab" anchors instead receive `inlineUrl` (derived inside this component
   * from `pdfUrl`, i.e. the `/api/pdf-proxy?…` URL), so a fresh tab renders
   * the PDF inline rather than triggering a download. Defaults to `pdfUrl`
   * when omitted, preserving prior call-site behaviour.
   */
  pdfDownloadUrl?: string | null
  articleTitle?: string
  isOpenAccess?: boolean
  articleId?: number | string
  journalId?: number | string
  galleyId?: number | string
  triggerStyle?: "sidebar" | "card"
}

export function ModalPdfViewer({
  pdfUrl,
  pdfDownloadUrl,
  articleTitle = "Document",
  isOpenAccess,
  articleId,
  journalId,
  galleyId,
  triggerStyle = "sidebar",
}: ModalPdfViewerProps) {
  const {
    open,
    isMobile,
    loaded,
    loadTimedOut,
    probeState,
    errorCode,
    panelRef,
    iframeRef,
    openModal,
    closeModal,
    retry,
    handleIframeLoad,
    handleIframeError,
  } = usePdfModal(pdfUrl, {
    isOpenAccess: isOpenAccess ?? true,
    articleId,
    journalId,
  })

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

  const iframeSrc = `${pdfUrl}${pdfUrl.includes("#") ? "&" : "#"}toolbar=1&navpanes=1&scrollbar=1&view=FitH`
  // Two distinct URLs for the two distinct actions:
  //   - inlineUrl  → `/api/pdf-proxy?…` (Content-Disposition: inline). Used for
  //     "Open in new tab" / "Open in Browser" so a fresh tab renders the PDF.
  //   - downloadUrl → clean OJS URL (Content-Disposition: attachment from OJS).
  //     Used for the explicit Download button.
  const inlineUrl = pdfUrl
  const downloadUrl = pdfDownloadUrl ?? pdfUrl

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
              articleTitle={articleTitle}
              downloadUrl={downloadUrl}
              inlineUrl={inlineUrl}
              iframeSrc={iframeSrc}
              isMobile={isMobile}
              isOpenAccess={isOpenAccess}
              articleId={articleId}
              journalId={journalId}
              galleyId={galleyId}
              loaded={loaded}
              loadTimedOut={loadTimedOut}
              probeState={probeState}
              errorCode={errorCode}
              panelRef={panelRef}
              iframeRef={iframeRef}
              onClose={closeModal}
              onIframeLoad={handleIframeLoad}
              onIframeError={handleIframeError}
              onRetry={retry}
            />,
            document.body
          )
        : null}
    </>
  )
}
