import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"

interface PdfViewerProps {
  pdfUrl: string | null
}

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)

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
    <div className="w-full h-[800px] rounded-xl overflow-hidden border border-border/50 shadow-sm bg-card flex flex-col mt-12 transition-all duration-500">
       <div className="bg-muted/50 p-3 border-b border-border/50 flex justify-between items-center px-4">
         <span className="text-sm font-semibold flex items-center gap-2">
           <FileText className="h-4 w-4 text-primary" />
           Document Viewer
         </span>
         {isLoading && (
           <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
             <Loader2 className="h-3 w-3 animate-spin" />
             Loading document...
           </div>
         )}
       </div>
       <div className="flex-1 relative bg-muted/5">
         {isLoading && (
           <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/50 backdrop-blur-[2px]">
             <div className="relative">
               <Loader2 className="h-10 w-10 text-primary animate-spin" />
               <FileText className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
             </div>
             <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing viewer...</p>
           </div>
         )}
         <iframe 
           src={proxySrc} 
           className={`w-full h-full border-none transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
           title="PDF Viewer"
           sandbox="allow-same-origin"
           onLoad={() => setIsLoading(false)}
         />
       </div>
    </div>
  )
}

