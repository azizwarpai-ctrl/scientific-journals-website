import { useState, useEffect, useCallback, useRef } from "react"

export type PdfProbeState = "idle" | "probing" | "ready" | "error"

export type PdfErrorCode =
  | "AUTH_REQUIRED"
  | "FILE_NOT_FOUND"
  | "INVALID_RESPONSE"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "UNKNOWN"

function isSameOriginUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true
  if (typeof window === "undefined") return false
  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

async function probePdfUrl(
  url: string,
  signal: AbortSignal
): Promise<{ ok: true } | { ok: false; code: PdfErrorCode }> {
  // Cross-origin URLs (direct OJS) can't be probed from the browser under
  // CORS. Trust them and let the iframe load/timeout path handle failures.
  if (!isSameOriginUrl(url)) {
    return { ok: true }
  }
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store", signal })
    // Body isn't needed — we only inspected headers. Drain + cancel so the
    // server-side stream can close instead of being held open.
    res.body?.cancel().catch(() => {})
    if (res.ok) {
      const contentType = (res.headers.get("content-type") || "").toLowerCase()
      if (contentType.startsWith("application/pdf") || contentType.startsWith("application/octet-stream")) {
        return { ok: true }
      }
      return { ok: false, code: "INVALID_RESPONSE" }
    }
    const header = res.headers.get("X-Proxy-Error")
    const code = isPdfErrorCode(header) ? header : "UNKNOWN"
    return { ok: false, code }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err
    }
    return { ok: false, code: "NETWORK_ERROR" }
  }
}

function isPdfErrorCode(value: string | null): value is PdfErrorCode {
  return (
    value === "AUTH_REQUIRED" ||
    value === "FILE_NOT_FOUND" ||
    value === "INVALID_RESPONSE" ||
    value === "UPSTREAM_ERROR" ||
    value === "TIMEOUT" ||
    value === "NETWORK_ERROR"
  )
}

export function usePdfModal(pdfUrl: string | null) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadTimedOut, setLoadTimedOut] = useState(false)
  const [probeState, setProbeState] = useState<PdfProbeState>("idle")
  const [errorCode, setErrorCode] = useState<PdfErrorCode | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openModal = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement
    setLoaded(false)
    setLoadTimedOut(false)
    setProbeState("probing")
    setErrorCode(null)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  const retry = useCallback(() => {
    setLoaded(false)
    setLoadTimedOut(false)
    setProbeState("probing")
    setErrorCode(null)
    setRetryNonce((n) => n + 1)
  }, [])

  const handleIframeLoad = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    setLoaded(true)
  }, [])

  const handleIframeError = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    setProbeState("error")
    setErrorCode((prev) => prev ?? "NETWORK_ERROR")
  }, [])

  // Probe the URL each time the modal opens (or the user hits retry).
  // `probeState` is set to "probing" synchronously by openModal/retry, so
  // this effect only needs to kick off the async probe.
  useEffect(() => {
    if (!open || !pdfUrl) return
    const controller = new AbortController()
    probePdfUrl(pdfUrl, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.ok) {
          setProbeState("ready")
        } else {
          setProbeState("error")
          setErrorCode(result.code)
        }
      })
      .catch(() => {
        /* aborted — component unmounted or retry superseded */
      })
    return () => controller.abort()
  }, [open, pdfUrl, retryNonce])

  // Focus trap, scroll lock, load timeout.
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
  }, [open, closeModal, retryNonce])

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
    probeState,
    errorCode,
    isMobile,
    panelRef,
    iframeRef,
    openModal,
    closeModal,
    retry,
    handleIframeLoad,
    handleIframeError,
  }
}
