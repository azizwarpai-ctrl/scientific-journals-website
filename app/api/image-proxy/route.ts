import { type NextRequest, NextResponse } from "next/server"

/**
 * OJS image proxy — fetches public assets from the OJS server using a
 * browser-style User-Agent with no Referer header, bypassing the WAF / hotlink
 * protection that blocks direct cross-origin <img> requests from digitopub.com.
 *
 * Security constraints:
 *   - Only OJS-managed hostnames are proxied.
 *   - The upstream response must be image/* or it is rejected.
 *   - 1 MB response cap to prevent abuse.
 *
 * Usage: /api/image-proxy?url=https%3A%2F%2Fsubmitmanager.com%2F...
 */

const ALLOWED_HOSTS = new Set([
  "submitmanager.com",
  "journals.digitopub.com",
])

const MAX_BYTES = 1 * 1024 * 1024 // 1 MB

// Browser-like UA ensures OJS nginx rules don't block the request as a bot
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const

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

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new NextResponse("Invalid protocol", { status: 400 })
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(rawUrl, {
      headers: FETCH_HEADERS,
      // Explicitly omit Referer so nginx hotlink rules don't trigger
      redirect: "follow",
    })
  } catch (err) {
    console.warn("[image-proxy] fetch failed", rawUrl, String(err))
    return new NextResponse("Upstream unreachable", { status: 502 })
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status })
  }

  const contentType = upstream.headers.get("content-type") ?? ""
  if (!contentType.startsWith("image/")) {
    return new NextResponse("Upstream did not return an image", { status: 502 })
  }

  const buffer = await upstream.arrayBuffer()
  if (buffer.byteLength > MAX_BYTES) {
    return new NextResponse("Image too large", { status: 502 })
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
