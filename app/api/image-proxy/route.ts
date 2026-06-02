import { type NextRequest, NextResponse } from "next/server"

import { getOjsHostnames } from "@/src/features/ojs/utils/ojs-config"

/**
 * OJS image proxy — fetches public assets from the OJS server using a
 * browser-style User-Agent with no Referer header, bypassing the WAF / hotlink
 * protection that blocks direct cross-origin <img> requests from digitopub.com.
 *
 * Security constraints:
 *   - Only OJS-managed hostnames are proxied (re-validated on each redirect hop).
 *   - Only raster MIME types are returned (SVG is blocked to prevent stored XSS
 *     via inline scripts that would execute under digitopub.com's origin).
 *   - The response body is read as a stream and aborted past MAX_BYTES so a
 *     malicious upstream cannot exhaust memory by lying in content-length.
 *
 * Usage: /api/image-proxy?url=https%3A%2F%2Fjournals.digitopub.com%2F...
 */

const ALLOWED_HOSTS = getOjsHostnames()

// SVG is intentionally excluded — it's an executable XML format that can carry
// <script> and run under the calling origin.
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
])

const MAX_BYTES = 1 * 1024 * 1024 // 1 MB
const MAX_REDIRECTS = 3

// Browser-like UA ensures OJS nginx rules don't block the request as a bot
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "image/webp,image/avif,image/png,image/jpeg,image/gif",
  "Accept-Language": "en-US,en;q=0.9",
} as const

function hostAllowed(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false
  return ALLOWED_HOSTS.has(url.hostname)
}

/**
 * Fetch the URL, following redirects manually so each hop's host is
 * re-validated against the allowlist. A `redirect: "follow"` fetch would let an
 * allowlisted host bounce us to an arbitrary external origin.
 */
async function fetchWithAllowlistedRedirects(initialUrl: string): Promise<Response> {
  let currentUrl = initialUrl
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const parsed = new URL(currentUrl)
    if (!hostAllowed(parsed)) {
      throw new Error(`redirect target not allowlisted: ${parsed.hostname}`)
    }
    const upstream = await fetch(currentUrl, {
      headers: FETCH_HEADERS,
      // Explicitly omit Referer so nginx hotlink rules don't trigger
      redirect: "manual",
    })
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location")
      if (!location) {
        throw new Error("redirect without Location header")
      }
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }
    return upstream
  }
  throw new Error("too many redirects")
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get("url")

  if (!rawUrl) {
    return new NextResponse("Missing url parameter", { status: 400 })
  }

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return new NextResponse("Invalid url", { status: 400 })
  }

  if (!hostAllowed(target)) {
    return new NextResponse("Host not allowed", { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetchWithAllowlistedRedirects(rawUrl)
  } catch (err) {
    console.warn("[image-proxy] fetch failed", rawUrl, String(err))
    return new NextResponse("Upstream unreachable", { status: 502 })
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status })
  }

  const contentType = (upstream.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase()
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return new NextResponse("Upstream did not return an allowed image type", { status: 502 })
  }

  // Trust content-length only as a fast-path rejection — a malicious upstream
  // can lie, so we still cap the streamed read below.
  const declaredLength = Number(upstream.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    return new NextResponse("Image too large", { status: 502 })
  }

  if (!upstream.body) {
    return new NextResponse("Empty response body", { status: 502 })
  }

  // Stream the body, tracking bytes read so we can abort past MAX_BYTES
  // without buffering the whole payload.
  const reader = upstream.body.getReader()
  const chunks: Uint8Array[] = []
  let bytesRead = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      bytesRead += value.byteLength
      if (bytesRead > MAX_BYTES) {
        await reader.cancel()
        return new NextResponse("Image too large", { status: 502 })
      }
      chunks.push(value)
    }
  } catch (err) {
    console.warn("[image-proxy] body read failed", rawUrl, String(err))
    return new NextResponse("Upstream read failed", { status: 502 })
  }

  const buffer = new Uint8Array(bytesRead)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Cache aggressively — OJS images don't change often
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      Vary: "Accept",
    },
  })
}
