import { useState, useEffect, useCallback, useRef } from "react"

export type Phase = "loading" | "ready" | "timeout"

/**
 * Custom hook to manage the state and logic for the PDF viewer modal.
 * Handles phase transitions (loading -> ready/timeout), attempt tracking,
 * and keyboard/scroll management.
 */
export function usePdfModal() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("loading")
  const [attempt, setAttempt] = useState(0)
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement
    setPhase("loading")
    setAttempt((n) => n + 1)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const retry = useCallback(() => {
    setPhase("loading")
    setAttempt((n) => n + 1)
  }, [])

  // Body scroll-lock + keyboard handling while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const panel = panelRef.current
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )
    requestAnimationFrame(() => focusables?.[0]?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        closeModal()
        return
      }
      if (e.key === "Tab" && panel) {
        const items = panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
      triggerRef.current?.focus()
    }
  }, [open, closeModal])

  // Timeout logic: transition to 'timeout' after 25s of loading.
  useEffect(() => {
    if (!open || phase !== "loading") return
    const timer = setTimeout(() => {
      setPhase("timeout")
    }, 25000)
    return () => clearTimeout(timer)
  }, [open, phase, attempt])

  const handleIframeLoad = useCallback(() => {
    setPhase("ready")
  }, [])

  // Detect mobile environment
  const [isMobile] = useState(() => {
    if (typeof navigator === "undefined") return false
    const ua =
      navigator.userAgent ||
      navigator.vendor ||
      (window as unknown as { opera?: string }).opera ||
      ""
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      ua
    )
  })

  return {
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
  }
}
