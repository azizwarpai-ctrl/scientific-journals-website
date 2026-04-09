"use client"

import { FileText } from "lucide-react"

interface PdfViewerProps {
  pdfUrl: string | null
}

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed border-border/50 rounded-xl">
        <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-muted-foreground text-center">PDF not available for this article.</p>
      </div>
    )
  }

  // Base64 encode to safely pass through the query parameters to our proxy endpoint
  // Use btoa safely on the client
  const encodedUrl = typeof window !== 'undefined' ? btoa(pdfUrl) : Buffer.from(pdfUrl).toString('base64');
  const proxySrc = `/api/journals/proxy-pdf?url=${encodedUrl}`;

  return (
    <div className="w-full h-[800px] rounded-xl overflow-hidden border border-border/50 shadow-sm bg-card flex flex-col mt-12">
       <div className="bg-muted/50 p-3 border-b border-border/50 flex justify-between items-center px-4">
         <span className="text-sm font-semibold flex items-center gap-2">
           <FileText className="h-4 w-4 text-primary" />
           Document Viewer
         </span>
       </div>
       <iframe 
         src={proxySrc} 
         className="w-full flex-1" 
         title="PDF Viewer"
       />
    </div>
  )
}

