"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"

interface DoiCopyButtonProps {
  doi: string
}

export function DoiCopyButton({ doi }: DoiCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(`https://doi.org/${doi}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea")
      el.value = `https://doi.org/${doi}`
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold px-2 py-0.5 rounded-md bg-muted/50 border border-border/40 text-xs">DOI</span>
      <a
        href={`https://doi.org/${doi}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary hover:underline transition-colors flex items-center gap-1 break-all text-sm"
      >
        {doi}
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </a>
      <button
        onClick={handleCopy}
        aria-label="Copy DOI to clipboard"
        title="Copy DOI URL"
        className={[
          "flex h-6 w-6 items-center justify-center rounded-md border text-xs transition-all",
          copied
            ? "border-emerald-300 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
            : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/30",
        ].join(" ")}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  )
}
