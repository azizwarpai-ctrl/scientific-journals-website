import { useState, useEffect, useCallback, useRef } from "react"

export function usePdfModal() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadTimedOut, setLoadTimedOut] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement
    setLoaded(false)
    setLoadTimedOut(false)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const handleIframeLoad = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
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

    const loadTimer = setTimeout(() => {
      setLoadTimedOut(true)
    }, 20000)
    loadTimerRef.current = loadTimer

    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      triggerRef.current?.focus()
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    }
  }, [open, closeModal])

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
    loaded,
    loadTimedOut,
    isMobile,
    panelRef,
    iframeRef,
    openModal,
    closeModal,
    handleIframeLoad,
  }
}
