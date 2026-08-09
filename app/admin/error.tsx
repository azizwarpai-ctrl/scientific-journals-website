"use client"

import { useEffect } from "react"
import { GenericError } from "@/components/errors/error-states"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Admin segment error:", error)
  }, [error])

  return (
    <GenericError
      message="Something went wrong loading this admin page. Please try again."
      retry={reset}
    />
  )
}
