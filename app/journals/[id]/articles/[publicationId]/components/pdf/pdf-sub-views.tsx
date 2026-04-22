"use client"

import {
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  RefreshCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface BaseSubViewProps {
  downloadUrl: string | null
}

interface ActionSubViewProps extends BaseSubViewProps {
  onRetry: () => void
}

export function MobileView({ downloadUrl, onRetry }: ActionSubViewProps) {
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

export function GatedView({ articleTitle }: { articleTitle: string }) {
  const ojsBase = process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://submitmanager.com/ojs"
  const loginUrl = `${ojsBase}/index.php/index/login`

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 p-12 text-center bg-[#1a1a1a] animate-in fade-in zoom-in-95 duration-500">
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse" />
        <div className="relative w-24 h-24 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-2xl">
          <AlertCircle className="h-12 w-12 text-primary" />
        </div>
      </div>

      <div className="space-y-3 max-w-lg">
        <h3 className="text-2xl font-bold text-white tracking-tight">Restricted Access</h3>
        <p className="text-base text-white/60 leading-relaxed">
          The full-text version of <span className="text-white/90 font-semibold">"{articleTitle}"</span> is currently restricted to subscribers and institutional members.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Button
          asChild
          className="h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all transform hover:scale-105"
        >
          <a href={loginUrl} target="_blank" rel="noopener noreferrer">
            Login to OJS
          </a>
        </Button>
        <p className="text-xs text-white/40 max-w-[200px]">
          Subscription access is managed via the OJS submission platform.
        </p>
      </div>

      <div className="pt-8 grid grid-cols-3 gap-6 w-full max-w-sm border-t border-white/5">
        <div className="flex flex-col items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-primary/40" />
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Secure</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-primary/40" />
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Verified</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-primary/40" />
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Rights</span>
        </div>
      </div>
    </div>
  )
}

export function TimeoutView({ downloadUrl, onRetry }: ActionSubViewProps) {
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
