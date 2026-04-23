import { NextResponse } from "next/server"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

type ProxyErrorCode =
  | "BAD_REQUEST"
  | "AUTH_REQUIRED"
  | "FILE_NOT_FOUND"
  | "INVALID_RESPONSE"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"

const FETCH_TIMEOUT_MS = 15000
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // "%PDF"
const ACCEPTED_CONTENT_TYPES = /^(application\/pdf|application\/x-pdf|application\/octet-stream|binary\/octet-stream)/i

// Presenting as a browser bypasses WAFs / hotlink rules that silently reject
// bot-like User-Agents with 403/HTML login pages.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

function jsonError(
  code: ProxyErrorCode,
  message: string,
  status: number,
  sourceUrl?: string
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
    },
  })
}

function startsWithPdfMagic(chunk: Uint8Array): boolean {
  if (chunk.length < PDF_MAGIC.length) return false
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (chunk[i] !== PDF_MAGIC[i]) return false
  }
  return true
}

function looksLikeHtml(chunk: Uint8Array): boolean {
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

function buildStream(
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const journal = searchParams.get("journal")
  const submissionId = searchParams.get("submissionId")
  const galleyId = searchParams.get("galleyId")
  const fileId = searchParams.get("fileId")

  if (!journal || !submissionId || !galleyId) {
    return jsonError(
      "BAD_REQUEST",
      "Missing required parameters (journal, submissionId, galleyId).",
      400
    )
  }

  const ID_PATTERN = /^\d+$/
  const JOURNAL_PATTERN = /^[A-Za-z0-9._-]+$/
  if (
    !ID_PATTERN.test(submissionId) ||
    !ID_PATTERN.test(galleyId) ||
    (fileId && !ID_PATTERN.test(fileId)) ||
    !JOURNAL_PATTERN.test(journal)
  ) {
    return jsonError("BAD_REQUEST", "Invalid parameter format.", 400)
  }

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

  const apiKey = process.env.OJS_API_KEY
  const articlePageReferer = `${baseUrl}/index.php/${journal}/article/view/${submissionId}`

  const fetchWithTimeout = async (
    url: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<Response> => {
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
          ...extraHeaders,
        },
        signal: controller.signal,
        redirect: "manual",
        cache: "no-store",
      })
    } finally {
      clearTimeout(timer)
    }
  }

  // Follow same-host redirects; block cross-host or auth redirects.
  const followRedirects = async (
    startUrl: string,
    headers: Record<string, string>,
    maxHops = 5
  ): Promise<{ res: Response; finalUrl: string } | NextResponse> => {
    let currentUrl = startUrl
    let currentHeaders = headers
    for (let hop = 0; hop <= maxHops; hop++) {
      const res = await fetchWithTimeout(currentUrl, currentHeaders)
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
      currentHeaders = { ...currentHeaders }
      delete currentHeaders.Authorization
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

    // Peek first bytes to verify PDF magic / detect HTML shells.
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
      try { reader.releaseLock() } catch { /* ignore */ }
      return jsonError("UPSTREAM_ERROR", "Source closed connection.", 502, sourceUrl)
    }

    if (totalBytes === 0) {
      try { reader.releaseLock() } catch { /* ignore */ }
      return jsonError("INVALID_RESPONSE", "Source returned empty body.", 502, sourceUrl)
    }

    const buffer = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }

    if (!startsWithPdfMagic(buffer)) {
      try { reader.releaseLock() } catch { /* ignore */ }
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
      try { reader.releaseLock() } catch { /* ignore */ }
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
      "Content-Disposition": `inline; filename="article-${submissionId}.pdf"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Accept-Ranges": "none",
    }
    const contentLength = res.headers.get("content-length")
    if (contentLength && /^\d+$/.test(contentLength)) {
      outHeaders["Content-Length"] = contentLength
    }
    return new NextResponse(stream, { status: 200, headers: outHeaders })
  }

  const attempt = async (
    url: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<NextResponse> => {
    try {
      const followed = await followRedirects(url, extraHeaders)
      if (followed instanceof NextResponse) return followed
      return await streamPdfResponse(followed.res, followed.finalUrl)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return jsonError("TIMEOUT", "Source did not respond in time.", 504, url)
      }
      return jsonError("NETWORK_ERROR", "Network error contacting source.", 502, url)
    }
  }

  // Path 1: OJS REST API with Bearer auth (preferred — bypasses session/hotlink).
  if (apiKey && fileId) {
    const apiUrl = `${baseUrl}/index.php/${journal}/api/v1/submissions/${submissionId}/files/${fileId}/download`
    const apiResult = await attempt(apiUrl, { Authorization: `Bearer ${apiKey}` })
    if (apiResult.ok) return apiResult
    // Fall through on retriable errors; terminal errors surface directly.
    const code = apiResult.headers.get("X-Proxy-Error")
    if (code && !["AUTH_REQUIRED", "UPSTREAM_ERROR", "INVALID_RESPONSE", "FILE_NOT_FOUND", "TIMEOUT"].includes(code)) {
      return apiResult
    }
    console.warn(`[PDF Proxy] REST API attempt failed (${code ?? "unknown"}), falling back to web URL`)
  }

  // Path 2: Public galley web URL with browser-like headers.
  const webUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${galleyId}`
  return attempt(webUrl)
}

export async function HEAD(request: Request) {
  return GET(request)
}
