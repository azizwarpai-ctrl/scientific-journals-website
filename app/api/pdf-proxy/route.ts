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

interface ProxyErrorBody {
  error: ProxyErrorCode
  message: string
  status: number
  source?: string
}

const FETCH_TIMEOUT_MS = 15000
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // "%PDF"
const ACCEPTED_CONTENT_TYPES = /^(application\/pdf|application\/x-pdf|application\/octet-stream|binary\/octet-stream)/i

/**
 * Real-browser User-Agent. Several OJS deployments have WAFs or hotlink rules
 * that silently reject "bot-like" User-Agents (including the previous
 * "DigitoPub-PDF-Proxy") with 403/HTML login pages. Presenting as a browser
 * ensures OJS hands back the raw PDF for the same public galley URLs the
 * browser would fetch.
 */
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"

function jsonError(
  code: ProxyErrorCode,
  message: string,
  status: number,
  sourceUrl?: string
): NextResponse {
  const body: ProxyErrorBody = { error: code, message, status }
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
    (text.startsWith("<?xml") && text.includes("<html")) ||
    text.includes("<head>") ||
    text.includes("user_login")
  )
}

function buildStreamFromChunks(
  first: Uint8Array,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number = FETCH_TIMEOUT_MS
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(first)
    },
    async pull(controller) {
      try {
        const readPromise = reader.read()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Body read timeout")), timeoutMs)
        )
        const { done, value } = await Promise.race([readPromise, timeoutPromise])
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
    return jsonError(
      "UPSTREAM_ERROR",
      "OJS source is not configured on the server.",
      502
    )
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

  // Build a Referer that matches the OJS article page. Several OJS/nginx setups
  // validate Referer to block hotlinking; sending the article view URL makes
  // the proxy indistinguishable from a user clicking "Download" in-page.
  const articlePageReferer = `${baseUrl}/index.php/${journal}/article/view/${submissionId}`

  const fetchWithTimeout = async (
    url: string,
    headers: Record<string, string> = {}
  ): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      return await fetch(url, {
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: articlePageReferer,
          ...headers,
        },
        signal: controller.signal,
        redirect: "manual",
        cache: "no-store",
      })
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Bootstrap a PKP/OJS session by GET-ing the article view page and
   * harvesting any Set-Cookie values (PHPSESSID, OJSSID, etc.). Many OJS
   * deployments tie `/article/download/` hotlink protection to a live
   * session cookie — a cold fetch with only UA+Referer gets a 403 login
   * page, but replaying those cookies makes the download succeed exactly
   * as it would when a user clicks the in-page "Download" link.
   *
   * Returns a `Cookie` header value (or `null` if no cookies were set).
   * Failures are swallowed — the caller keeps the ladder behaviour and
   * downgrades to anonymous retries.
   */
  const bootstrapSessionCookie = async (): Promise<string | null> => {
    try {
      const res = await fetchWithTimeout(articlePageReferer)
      // Follow HEAD through a single redirect hop to collect cookies set
      // on the canonicalised path (OJS often redirects from .../view/N
      // to .../view/N/ with Set-Cookie on the 302).
      const setCookies: string[] = []
      const collect = (r: Response) => {
        // Node ≥18 returns multiple set-cookie via getSetCookie(); fall
        // back to the concatenated header string for older runtimes.
        type HeadersWithGetSetCookie = Headers & { getSetCookie?: () => string[] }
        const h = r.headers as HeadersWithGetSetCookie
        if (typeof h.getSetCookie === "function") {
          for (const v of h.getSetCookie()) setCookies.push(v)
        } else {
          const raw = r.headers.get("set-cookie")
          if (raw) setCookies.push(raw)
        }
      }
      collect(res)
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location")
        if (location) {
          try {
            const target = new URL(location, articlePageReferer)
            if (target.host === ojsHost) {
              const hop = await fetchWithTimeout(target.toString())
              collect(hop)
            }
          } catch {
            /* ignore */
          }
        }
      }
      if (setCookies.length === 0) return null

      // Keep only the "name=value" of each cookie, join with "; " to form a
      // standard Cookie request header. Session-scoped cookies don't need
      // domain/path — we're replaying against the same host.
      const pairs = setCookies
        .map((c) => c.split(";")[0]?.trim())
        .filter((p): p is string => Boolean(p && p.includes("=")))
      return pairs.length > 0 ? pairs.join("; ") : null
    } catch {
      return null
    }
  }

  const followRedirects = async (
    startUrl: string,
    initHeaders: Record<string, string>,
    maxHops = 5
  ): Promise<{ res: Response; finalUrl: string } | NextResponse> => {
    let currentUrl = startUrl
    let headers = initHeaders
    for (let hop = 0; hop <= maxHops; hop++) {
      const res = await fetchWithTimeout(currentUrl, headers)

      if (res.status < 300 || res.status > 399) {
        return { res, finalUrl: currentUrl }
      }

      const location = res.headers.get("location")
      if (!location) {
        console.warn(`[PDF Proxy] Redirect ${res.status} without Location header for ${currentUrl}`)
        return jsonError(
          "UPSTREAM_ERROR",
          "Source server redirected without a target.",
          502,
          currentUrl
        )
      }

      const target = new URL(location, currentUrl)

      // Known OJS login/auth redirect patterns → auth wall.
      const pathLower = target.pathname.toLowerCase()
      if (
        pathLower.includes("/login") ||
        pathLower.includes("/user/login") ||
        pathLower.includes("signin")
      ) {
        console.warn(`[PDF Proxy] Upstream redirected to auth page: ${target.toString()}`)
        return jsonError(
          "AUTH_REQUIRED",
          "This file requires access permission on the source server.",
          403,
          currentUrl
        )
      }

      // Only follow redirects to the same OJS host to avoid credential leaks.
      if (target.host !== ojsHost) {
        console.warn(
          `[PDF Proxy] Blocked cross-host redirect: ${currentUrl} → ${target.toString()}`
        )
        return jsonError(
          "UPSTREAM_ERROR",
          "Source server redirected to an untrusted host.",
          502,
          currentUrl
        )
      }

      // Drop Authorization when we move across URLs, even same-host, to be safe
      // on redirect chains that leave the protected path.
      headers = { ...headers }
      delete headers.Authorization

      currentUrl = target.toString()
    }

    console.warn(`[PDF Proxy] Too many redirects starting at ${startUrl}`)
    return jsonError(
      "UPSTREAM_ERROR",
      "Source server produced too many redirects.",
      502,
      startUrl
    )
  }

  const streamPdfResponse = async (
    res: Response,
    sourceUrl: string
  ): Promise<NextResponse> => {
    if (res.status === 401 || res.status === 403) {
      return jsonError(
        "AUTH_REQUIRED",
        "This file requires access permission on the source server.",
        403,
        sourceUrl
      )
    }
    if (res.status === 404 || res.status === 410) {
      return jsonError(
        "FILE_NOT_FOUND",
        "PDF file was not found on the source server.",
        404,
        sourceUrl
      )
    }
    if (res.status >= 500) {
      return jsonError(
        "UPSTREAM_ERROR",
        "Source server is temporarily unavailable.",
        502,
        sourceUrl
      )
    }
    if (!res.ok) {
      return jsonError(
        "UPSTREAM_ERROR",
        `Source server returned status ${res.status}.`,
        502,
        sourceUrl
      )
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase()

    if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
      return jsonError(
        "AUTH_REQUIRED",
        "Source server returned an HTML page (likely requires authentication).",
        403,
        sourceUrl
      )
    }

    if (!res.body) {
      return jsonError(
        "INVALID_RESPONSE",
        "Source server returned an empty response.",
        502,
        sourceUrl
      )
    }

    // Accumulate initial chunks until we have enough bytes to validate PDF magic.
    // If the first read is < 4 bytes, read again; stop once we have the magic bytes
    // or EOF, then validate and rebuild the full stream.
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let totalBytes = 0
    const MAGIC_SIZE = PDF_MAGIC.length
    const PEEK_LIMIT = 2048 // Limit peeking to prevent memory bloat

    try {
      while (totalBytes < MAGIC_SIZE && totalBytes < PEEK_LIMIT) {
        const { done, value } = await reader.read()
        if (done) break
        if (value && value.length > 0) {
          chunks.push(value)
          totalBytes += value.length
        }
      }
    } catch (err) {
      try { reader.releaseLock() } catch { /* ignore */ }
      console.error(`[PDF Proxy] Error reading upstream body for ${sourceUrl}:`, err)
      return jsonError(
        "UPSTREAM_ERROR",
        "Source server closed the connection while sending the file.",
        502,
        sourceUrl
      )
    }

    if (totalBytes === 0) {
      try { reader.releaseLock() } catch { /* ignore */ }
      return jsonError(
        "INVALID_RESPONSE",
        "Source server returned an empty PDF body.",
        502,
        sourceUrl
      )
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
          "Source server returned an HTML page instead of a PDF (likely requires authentication).",
          403,
          sourceUrl
        )
      }
      return jsonError(
        "INVALID_RESPONSE",
        "Source server returned an invalid file (expected a PDF).",
        502,
        sourceUrl
      )
    }

    // Only accept explicit PDF/binary content types; reject everything else.
    if (contentType && !ACCEPTED_CONTENT_TYPES.test(contentType)) {
      try { reader.releaseLock() } catch { /* ignore */ }
      return jsonError(
        "INVALID_RESPONSE",
        `Source server returned unexpected content type: ${contentType}.`,
        502,
        sourceUrl
      )
    }

    const stream = buildStreamFromChunks(buffer, reader)

    const outHeaders: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="article-${submissionId}.pdf"`,
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Accept-Ranges": "none",
    }

    const contentLength = res.headers.get("content-length")
    if (contentLength && /^\d+$/.test(contentLength)) {
      outHeaders["Content-Length"] = contentLength
    }

    if (process.env.NODE_ENV !== "production") {
      outHeaders["X-PDF-Proxy-Source"] = sourceUrl
    }

    return new NextResponse(stream, { status: 200, headers: outHeaders })
  }

  const attempt = async (
    url: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<NextResponse> => {
    const followed = await followRedirects(url, extraHeaders)
    if (followed instanceof NextResponse) return followed
    return streamPdfResponse(followed.res, followed.finalUrl)
  }

  // Wrap attempt() so thrown errors (AbortError, network) are safely converted
  // to a NextResponse with X-Proxy-Error set. This ensures the loop continues
  // to the next candidate instead of breaking the whole try block.
  const safeAttempt = async (
    url: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<NextResponse> => {
    try {
      return await attempt(url, extraHeaders)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return jsonError("TIMEOUT", "Source server did not respond in time.", 504, url)
      }
      return jsonError(
        "UPSTREAM_ERROR",
        "Network error while contacting the source server.",
        502,
        url
      )
    }
  }

  // OJS 3.x REST API — preferred when an API key is configured. Bypasses the
  // public galley hotlink/permission wall entirely because it authenticates as
  // a publisher-level client.
  const apiUrl =
    apiKey && fileId
      ? `${baseUrl}/index.php/${journal}/api/v1/submissions/${submissionId}/files/${fileId}/download`
      : null

  // Full ladder of public galley URL shapes OJS has exposed over versions.
  // We try every variant before surfacing a hard permission error so that an
  // auth wall on one route doesn't sink the whole request when another route
  // (e.g. legacy viewFile, or the fileId-qualified form) still serves the PDF.
  const webCandidates: string[] = []
  const webDownloadUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${galleyId}`
  webCandidates.push(webDownloadUrl)
  if (fileId) {
    webCandidates.push(
      `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${galleyId}/${fileId}`
    )
  }
  // Legacy OJS 2.x / some hybrid deployments still route through viewFile.
  webCandidates.push(
    `${baseUrl}/index.php/${journal}/article/viewFile/${submissionId}/${galleyId}`
  )
  if (fileId) {
    webCandidates.push(
      `${baseUrl}/index.php/${journal}/article/viewFile/${submissionId}/${galleyId}/${fileId}`
    )
  }

  // Error codes that warrant trying the next candidate URL. We intentionally
  // retry on AUTH_REQUIRED because one route may 403 while another still streams
  // the raw file (different hotlink/permission checks per endpoint).
  const RETRIABLE_CODES = new Set([
    "AUTH_REQUIRED",
    "UPSTREAM_ERROR",
    "INVALID_RESPONSE",
    "FILE_NOT_FOUND",
    "TIMEOUT",
  ])

  try {
    if (apiUrl) {
      const apiResult = await safeAttempt(apiUrl, {
        Authorization: `Bearer ${apiKey}`,
      })
      if (apiResult.ok) return apiResult
      const errorHeader = apiResult.headers.get("X-Proxy-Error")
      if (!errorHeader || !RETRIABLE_CODES.has(errorHeader)) {
        return apiResult
      }
      console.warn(
        `[PDF Proxy] REST API attempt failed (${errorHeader}), falling back to public galley URLs`
      )
    }

    let lastResult: NextResponse | null = null
    let sessionCookie: string | null = null
    for (const url of webCandidates) {
      const headers: Record<string, string> = sessionCookie ? { Cookie: sessionCookie } : {}
      const result = await safeAttempt(url, headers)
      if (result.ok) return result
      lastResult = result
      const code = result.headers.get("X-Proxy-Error")
      if (code && !RETRIABLE_CODES.has(code)) break
      if (code) {
        console.warn(`[PDF Proxy] Candidate "${url}" failed (${code}); trying next URL shape`)
      }

      // If the first anonymous attempt hit an OJS hotlink / session wall,
      // bootstrap a real browsing session and retry the same URL with the
      // captured cookies before moving on to the next URL shape.
      if (!sessionCookie && code === "AUTH_REQUIRED") {
        sessionCookie = await bootstrapSessionCookie()
        if (sessionCookie) {
          console.warn(
            `[PDF Proxy] AUTH_REQUIRED on "${url}"; retrying with session cookie bootstrapped from article page`
          )
          const retry = await safeAttempt(url, { Cookie: sessionCookie })
          if (retry.ok) return retry
          lastResult = retry
          const retryCode = retry.headers.get("X-Proxy-Error")
          if (retryCode && !RETRIABLE_CODES.has(retryCode)) break
        }
      }
    }

    return lastResult ?? jsonError("UPSTREAM_ERROR", "No candidate URLs available.", 502)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[PDF Proxy] Request timed out")
      return jsonError(
        "TIMEOUT",
        "Source server did not respond in time.",
        504
      )
    }
    console.error("[PDF Proxy] Network error:", error)
    return jsonError(
      "NETWORK_ERROR",
      "Network error while contacting the source server.",
      502
    )
  }
}

