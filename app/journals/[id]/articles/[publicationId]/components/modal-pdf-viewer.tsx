"use client"

import { createPortal } from "react-dom"
import { FileText, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

import { usePdfModal } from "./pdf/use-pdf-modal"
import { PdfModalOverlay } from "./pdf/pdf-modal-overlay"

interface ModalPdfViewerProps {
  pdfUrl: string | null
  articleTitle?: string
  triggerStyle?: "sidebar" | "card"
}

export function ModalPdfViewer({
  pdfUrl,
  articleTitle = "Document",
  triggerStyle = "sidebar",
}: ModalPdfViewerProps) {
  const {
    open,
    isMobile,
    loaded,
    panelRef,
    iframeRef,
    openModal,
    closeModal,
    handleIframeLoad,
  } = usePdfModal()

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
              downloadUrl={pdfUrl}
              iframeSrc={iframeSrc}
              isMobile={isMobile}
              loaded={loaded}
              panelRef={panelRef}
              iframeRef={iframeRef}
              onClose={closeModal}
              onIframeLoad={handleIframeLoad}
            />,
            document.body
          )
        : null}
    </>
  )
}
