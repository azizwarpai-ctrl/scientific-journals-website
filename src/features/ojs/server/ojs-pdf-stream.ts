import { NextResponse } from "next/server"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"
import {
  REDIRECT_STATUSES,
  resolveOjsRedirectTarget,
} from "@/src/features/ojs/utils/ojs-hosts"

export type ProxyErrorCode =
  | "BAD_REQUEST"
  | "AUTH_REQUIRED"
  | "FILE_NOT_FOUND"
  | "INVALID_RESPONSE"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"

export const FETCH_TIMEOUT_MS = 15000
export const MAX_BRIDGE_REDIRECTS = 3
export const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // "%PDF"
export const ACCEPTED_CONTENT_TYPES =
  /^(application\/pdf|application\/x-pdf|application\/octet-stream|binary\/octet-stream)/i

export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

export function jsonError(
  code: ProxyErrorCode,
  message: string,
  status: number,
  sourceUrl?: string,
  extraHeaders?: Record<string, string>
): NextResponse {
  const body: Record<string, unknown> = { error: code, message, status }
  if (sourceUrl && process.env.NODE_ENV !== "production") {
    body.source = sourceUrl
  }
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Proxy-Error": code,
      ...extraHeaders,
    },
  })
}

export function startsWithPdfMagic(chunk: Uint8Array): boolean {
  if (chunk.length < PDF_MAGIC.length) return false
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (chunk[i] !== PDF_MAGIC[i]) return false
  }
  return true
}

export function looksLikeHtml(chunk: Uint8Array): boolean {
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(chunk.subarray(0, Math.min(chunk.length, 512)))
    .trimStart()
    .toLowerCase()
  return (
    text.startsWith("<!doctype html") ||
    text.startsWith("<html") ||
    text.includes("<head>") ||
    text.includes("user_login")
  )
}

export function buildStream(
  first: Uint8Array,
  reader: ReadableStreamDefaultReader<Uint8Array>
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(first)
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }
        if (value) controller.enqueue(value)
      } catch (err) {
        controller.error(err)
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {})
    },
  })
}

export interface StreamOjsPdfOptions {
  journal: string
  submissionId: string
  galleyId: string
  fileId?: string | null
  filename?: string
  contentDisposition?: "inline" | "attachment"
  cacheControl?: string
  extraHeaders?: Record<string, string>
}

/**
 * Shared core for streaming an OJS galley PDF with validation:
 * Path 0: OJS PDF Bridge (ojs-pdf-bridge.php) with Bearer token
 * Path 1: Direct OJS Web URL (/article/download/{s}/{g}/{f} or /{s}/{g})
 *
 * Verifies magic bytes (%PDF) to prevent streaming HTML error/login shells.
 */
export async function streamOjsPdf(options: StreamOjsPdfOptions): Promise<NextResponse> {
  const {
    journal,
    submissionId,
    galleyId,
    fileId,
    filename = `article-${submissionId}.pdf`,
    contentDisposition = "inline",
    cacheControl = "public, max-age=3600, stale-while-revalidate=86400",
    extraHeaders = {},
  } = options

  // ─── Path 0: OJS PDF Bridge ───────────────────────────────────────────
  const apiKey = process.env.OJS_API_KEY
  const bridgeBase =
    process.env.OJS_BRIDGE_URL ??
    process.env.OJS_PDF_BRIDGE_URL ??
    (process.env.OJS_BASE_URL
      ? `${process.env.OJS_BASE_URL.replace(/\/$/, "")}/ojs-pdf-bridge.php`
      : null)

  if (!apiKey) {
    console.info("[ojs-pdf-stream] OJS_API_KEY not set, skipping bridge")
  } else if (!bridgeBase) {
    console.warn("[ojs-pdf-stream] OJS_BRIDGE_URL and OJS_BASE_URL both unset, skipping bridge")
  } else {
    try {
      let bridgeUrl = new URL(bridgeBase)
      bridgeUrl.searchParams.set("journal", journal)
      bridgeUrl.searchParams.set("submissionId", submissionId)
      bridgeUrl.searchParams.set("galleyId", galleyId)
      if (fileId) {
        bridgeUrl.searchParams.set("fileId", fileId)
      }

      const fetchBridge = (url: URL) =>
        fetch(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "digitopub-pdf-stream/1.0",
          },
          cache: "no-store",
          redirect: "manual",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })

      let bridgeRes = await fetchBridge(bridgeUrl)
      for (let hop = 0; hop < MAX_BRIDGE_REDIRECTS; hop++) {
        if (!REDIRECT_STATUSES.has(bridgeRes.status)) break

        const location = bridgeRes.headers.get("location")
        const target = resolveOjsRedirectTarget(location, bridgeUrl)
        if (!target) {
          console.warn("[ojs-pdf-stream] bridge redirect not followed", {
            status: bridgeRes.status,
            location,
          })
          break
        }
        bridgeRes.body?.cancel().catch(() => {})
        bridgeUrl = target
        bridgeRes = await fetchBridge(bridgeUrl)
      }

      if (bridgeRes.status === 429) {
        return jsonError(
          "RATE_LIMITED",
          "Too many requests, please try again shortly.",
          429,
          bridgeUrl.toString(),
          {
            "Retry-After": bridgeRes.headers.get("retry-after") ?? "60",
            "X-Proxy-Path": "bridge-429",
          }
        )
      }

      const bridgeCt = bridgeRes.headers.get("content-type") ?? ""
      if (bridgeRes.ok && bridgeCt.includes("pdf")) {
        if (!bridgeRes.body) {
          console.warn("[ojs-pdf-stream] bridge fall-through (empty body)", {
            bridgeStatus: bridgeRes.status,
            journal,
            submissionId,
          })
        } else {
          const reader = bridgeRes.body.getReader()
          const chunks: Uint8Array[] = []
          let totalBytes = 0
          try {
            while (totalBytes < PDF_MAGIC.length) {
              const { done, value } = await reader.read()
              if (done) break
              if (value && value.length > 0) {
                chunks.push(value)
                totalBytes += value.length
              }
            }
          } catch {
            await reader.cancel().catch(() => {})
            totalBytes = 0
          }

          if (totalBytes > 0) {
            const buffer = Buffer.concat(chunks, totalBytes)

            if (startsWithPdfMagic(buffer) && !looksLikeHtml(buffer)) {
              const stream = buildStream(buffer, reader)
              const outHeaders: Record<string, string> = {
                "Content-Type": "application/pdf",
                "Content-Disposition": `${contentDisposition}; filename="${filename}"`,
                "Cache-Control": cacheControl,
                "Accept-Ranges": "none",
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN",
                "X-Proxy-Path": "bridge",
                ...extraHeaders,
              }
              const contentLength = bridgeRes.headers.get("content-length")
              if (contentLength && /^\d+$/.test(contentLength)) {
                outHeaders["Content-Length"] = contentLength
              }
              return new NextResponse(stream, { status: 200, headers: outHeaders })
            }

            await reader.cancel().catch(() => {})
          }
        }
      }
    } catch (err) {
      console.warn("[ojs-pdf-stream] bridge fetch error", { error: String(err) })
    }
  }

  // ─── Path 1: OJS Web URL ──────────────────────────────────────────────
  let baseUrl: string
  try {
    baseUrl = getOjsBaseUrl()
  } catch {
    return jsonError("UPSTREAM_ERROR", "OJS source is not configured.", 502)
  }

  const ojsHost = (() => {
    try {
      return new URL(baseUrl).host
    } catch {
      return null
    }
  })()
  if (!ojsHost) {
    return jsonError("UPSTREAM_ERROR", "OJS base URL is invalid.", 502)
  }

  const articlePageReferer = `${baseUrl}/index.php/${journal}/article/view/${submissionId}`

  const fetchWithTimeout = async (url: string): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      return await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: articlePageReferer,
        },
        signal: controller.signal,
        redirect: "manual",
        cache: "no-store",
      })
    } finally {
      clearTimeout(timer)
    }
  }

  const followRedirects = async (
    startUrl: string,
    maxHops = 5
  ): Promise<{ res: Response; finalUrl: string } | NextResponse> => {
    let currentUrl = startUrl
    for (let hop = 0; hop <= maxHops; hop++) {
      const res = await fetchWithTimeout(currentUrl)
      if (res.status < 300 || res.status > 399) {
        return { res, finalUrl: currentUrl }
      }
      const location = res.headers.get("location")
      if (!location) {
        return jsonError("UPSTREAM_ERROR", "Source redirected without a target.", 502, currentUrl)
      }
      const target = new URL(location, currentUrl)
      const pathLower = target.pathname.toLowerCase()
      if (pathLower.includes("/login") || pathLower.includes("signin")) {
        return jsonError(
          "AUTH_REQUIRED",
          "This file requires access permission on the source server.",
          403,
          currentUrl
        )
      }
      if (target.host !== ojsHost) {
        return jsonError("UPSTREAM_ERROR", "Source redirected to an untrusted host.", 502, currentUrl)
      }
      currentUrl = target.toString()
    }
    return jsonError("UPSTREAM_ERROR", "Too many redirects.", 502, startUrl)
  }

  const streamPdfResponse = async (
    res: Response,
    sourceUrl: string
  ): Promise<NextResponse> => {
    if (res.status === 401 || res.status === 403) {
      return jsonError("AUTH_REQUIRED", "This file requires access permission.", 403, sourceUrl)
    }
    if (res.status === 404 || res.status === 410) {
      return jsonError("FILE_NOT_FOUND", "PDF not found on source server.", 404, sourceUrl)
    }
    if (!res.ok) {
      return jsonError("UPSTREAM_ERROR", `Source returned status ${res.status}.`, 502, sourceUrl)
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase()
    if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
      return jsonError(
        "AUTH_REQUIRED",
        "Source returned HTML (likely requires authentication).",
        403,
        sourceUrl
      )
    }
    if (!res.body) {
      return jsonError("INVALID_RESPONSE", "Source returned empty response.", 502, sourceUrl)
    }

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let totalBytes = 0
    try {
      while (totalBytes < PDF_MAGIC.length) {
        const { done, value } = await reader.read()
        if (done) break
        if (value && value.length > 0) {
          chunks.push(value)
          totalBytes += value.length
        }
      }
    } catch {
      await reader.cancel().catch(() => {})
      return jsonError("UPSTREAM_ERROR", "Source closed connection.", 502, sourceUrl)
    }

    if (totalBytes === 0) {
      await reader.cancel().catch(() => {})
      return jsonError("INVALID_RESPONSE", "Source returned empty body.", 502, sourceUrl)
    }

    const buffer = Buffer.concat(chunks, totalBytes)

    if (!startsWithPdfMagic(buffer)) {
      await reader.cancel().catch(() => {})
      if (looksLikeHtml(buffer)) {
        return jsonError(
          "AUTH_REQUIRED",
          "Source returned an HTML page instead of a PDF (likely requires authentication).",
          403,
          sourceUrl
        )
      }
      return jsonError("INVALID_RESPONSE", "Source returned a non-PDF file.", 502, sourceUrl)
    }

    if (contentType && !ACCEPTED_CONTENT_TYPES.test(contentType)) {
      await reader.cancel().catch(() => {})
      return jsonError(
        "INVALID_RESPONSE",
        `Unexpected content type: ${contentType}.`,
        502,
        sourceUrl
      )
    }

    const stream = buildStream(buffer, reader)
    const outHeaders: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${contentDisposition}; filename="${filename}"`,
      "Cache-Control": cacheControl,
      "Accept-Ranges": "none",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Proxy-Path": "web-url",
      ...extraHeaders,
    }
    const contentLength = res.headers.get("content-length")
    if (contentLength && /^\d+$/.test(contentLength)) {
      outHeaders["Content-Length"] = contentLength
    }
    return new NextResponse(stream, { status: 200, headers: outHeaders })
  }

  const webUrl = fileId
    ? `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${galleyId}/${fileId}`
    : `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${galleyId}`

  try {
    const followed = await followRedirects(webUrl)
    if (followed instanceof NextResponse) return followed
    return await streamPdfResponse(followed.res, followed.finalUrl)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("TIMEOUT", "Source did not respond in time.", 504, webUrl)
    }
    return jsonError("NETWORK_ERROR", "Network error contacting source.", 502, webUrl)
  }
}
