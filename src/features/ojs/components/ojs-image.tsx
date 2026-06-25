"use client"

/**
 * <OjsImage> — canonical component for every OJS-hosted image.
 *
 * Routes OJS URLs through /api/image-proxy so the fetch is made server-side
 * with a browser UA, bypassing the WAF / hotlink protection that blocks
 * direct cross-origin requests from digitopub.com browsers.
 *
 * Non-OJS URLs (external CDN, data: URIs, local /public paths) are passed
 * through unchanged.
 *
 * Usage:
 *   <OjsImage src={url} alt="…" fill className="object-cover" />
 *   <OjsImage src={url} alt="…" width={400} height={220} />
 *   <OjsImage src={url} alt="…" fallback={<Placeholder />} />
 */

import { type CSSProperties, type ReactNode, useState } from "react"

import { DEFAULT_OJS_LANDING_BASE_URL } from "@/src/features/ojs/utils/ojs-config"
import { normalizeOjsImageSrc } from "@/src/features/ojs/utils/rewrite-inline-images"

// ─── Internal constants ───────────────────────────────────────────────────────

// Client-safe allowlist — only canonical + env hosts needed because
// normalizeOjsImageSrc rewrites alias hosts to canonical before lookup.
const OJS_HOSTS = ((): Set<string> => {
  const hosts = new Set<string>()
  const tryAdd = (raw: string | undefined) => {
    if (!raw) return
    try {
      hosts.add(new URL(raw).hostname)
    } catch {
      // ignore malformed env values
    }
  }
  tryAdd(process.env.NEXT_PUBLIC_OJS_BASE_URL)
  tryAdd(DEFAULT_OJS_LANDING_BASE_URL)
  return hosts
})()

export function toProxyUrl(src: string): string | null {
  const normalized = normalizeOjsImageSrc(src)
  if (normalized === null) return null

  try {
    const { hostname, pathname } = new URL(normalized)
    if (OJS_HOSTS.has(hostname) && !pathname.startsWith("/api/image-proxy")) {
      return `/api/image-proxy?url=${encodeURIComponent(normalized)}`
    }
  } catch {
    // Relative path or data: URI — pass through unchanged
  }
  return normalized
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OjsImageProps {
  /** OJS asset URL (absolute). Null/undefined renders `fallback` immediately. */
  src?: string | null
  alt: string
  /**
   * Fills the nearest positioned ancestor (like next/image fill).
   * Adds `position:absolute; inset:0; width:100%; height:100%` inline.
   * The parent MUST have `position: relative/absolute/fixed`.
   */
  fill?: boolean
  width?: number
  height?: number
  className?: string
  /** Accepted but not used (no srcset generated). Kept for API parity. */
  sizes?: string
  /** Maps to `loading="eager"` to hint the browser to prioritise the fetch. */
  priority?: boolean
  draggable?: boolean
  style?: CSSProperties
  /** Rendered when src is falsy or the image fails to load. */
  fallback?: ReactNode
  /** Called after the image fails (in addition to showing fallback). */
  onError?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OjsImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
  draggable,
  style,
  fallback = null,
  onError: userOnError,
}: OjsImageProps) {
  const [failed, setFailed] = useState(false)
  const [lastSrc, setLastSrc] = useState(src)

  // "Adjust state during rendering" pattern — reset on src change without an
  // extra render cycle. Equivalent to getDerivedStateFromProps in classes.
  if (src !== lastSrc) {
    setLastSrc(src)
    setFailed(false)
  }

  if (!src || failed) {
    return <>{fallback}</>
  }

  const imgSrc = toProxyUrl(src)
  if (imgSrc === null) {
    return <>{fallback}</>
  }

  const imgStyle: CSSProperties = fill
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        ...style,
      }
    : (style ?? {})

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={draggable}
      style={imgStyle}
      onError={() => {
        setFailed(true)
        userOnError?.()
      }}
    />
  )
}
