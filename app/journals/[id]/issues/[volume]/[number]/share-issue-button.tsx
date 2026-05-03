"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"
import { toast } from "sonner"

interface ShareIssueButtonProps {
  issuePath: string
}

export function ShareIssueButton({ issuePath }: ShareIssueButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const fullUrl = `${window.location.origin}${issuePath}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast.success("Issue link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex-shrink-0 p-2.5 rounded-xl border border-border/50 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 text-muted-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      aria-label="Copy issue link"
      title="Copy issue link"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
    </button>
  )
}
