import Link from "next/link"
import { Button } from "@/components/ui/button"

export interface SubmitManuscriptButtonProps {
  submissionUrl?: string | null
  className?: string
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
  children: React.ReactNode
}

/**
 * Reusable Submit Manuscript button that links directly to OJS submission URL.
 * Renders null when no submission URL is available.
 */
export function SubmitManuscriptButton({
  submissionUrl,
  className = "",
  variant = "default",
  size,
  children,
}: SubmitManuscriptButtonProps) {
  if (!submissionUrl) return null

  const resolvedSize = size ?? (variant === "outline" ? "default" : "lg")

  return (
    <Button
      size={resolvedSize}
      variant={variant}
      className={className}
      asChild
    >
      <Link href={submissionUrl}>
        {children}
      </Link>
    </Button>
  )
}
