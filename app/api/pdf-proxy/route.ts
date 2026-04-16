import { NextResponse } from "next/server"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const journal = searchParams.get("journal")
  const submissionId = searchParams.get("submissionId")
  // galleyId is the OJS galley_id — correct for /article/download/{sub}/{galley}
  const galleyId = searchParams.get("galleyId")
  // fileId is submission_file_id — used only with OJS REST API + API key
  const fileId = searchParams.get("fileId")

  if (!journal || !submissionId || !galleyId) {
    return new NextResponse("Missing required parameters (journal, submissionId, galleyId)", { status: 400 })
  }

  const ID_PATTERN = /^\d+$/
  const JOURNAL_PATTERN = /^[A-Za-z0-9._-]+$/

  if (
    !ID_PATTERN.test(submissionId) ||
    !ID_PATTERN.test(galleyId) ||
    (fileId && !ID_PATTERN.test(fileId)) ||
    !JOURNAL_PATTERN.test(journal)
  ) {
    return new NextResponse("Invalid parameter format", { status: 400 })
  }

  const baseUrl = getOjsBaseUrl()
  const apiKey = process.env.OJS_API_KEY

  const FETCH_TIMEOUT = 15000

  const fetchWithTimeout = async (url: string, headers: Record<string, string> = {}) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      return await fetch(url, {
        headers: { "User-Agent": "DigitoPub-PDF-Proxy", ...headers },
        signal: controller.signal,
        redirect: "manual", // Detect redirects to login pages instead of silently following them
      })
    } finally {
      clearTimeout(timer)
    }
  }

  const webDownloadUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${galleyId}?inline=1`

  // Helper to validate and return the proxy response
  const handleOjsResponse = async (res: Response, sourceUrl: string) => {
    // 1. Detect redirects (OJS returns 302 to login page if PDF is restricted)
    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status <= 399)) {
      console.warn(`[PDF Proxy] OJS redirected request for ${sourceUrl}. Likely requires authentication.`);
      return new NextResponse("Access Denied: PDF requires authentication or is not published.", { status: 403 });
    }

    if (!res.ok) {
        console.error(`[PDF Proxy] Request failed: ${res.status} for ${sourceUrl}`);
        return new NextResponse(`OJS returned ${res.status}`, { status: res.status });
    }

    // 2. Validate Content-Type
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      console.error(`[PDF Proxy] Failed: Upstream returned HTML instead of PDF for ${sourceUrl}`);
      return new NextResponse("Failed to load PDF. Upstream returned an HTML page.", { status: 502 });
    }

    // 3. Optional: Read first few bytes to literally check for PDF magics could be done if contentType is unreliable,
    //    but OJS usually correctly sets text/html for login pages and application/pdf for galleys.

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="article-${submissionId}.pdf"`,
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        ...(process.env.NODE_ENV === "development" ? { "X-PDF-Proxy-Source": sourceUrl } : {})
      },
    });
  };

  try {
    // Strategy 1: REST API with API key (only if key + fileId available)
    if (apiKey && fileId) {
      const apiUrl = `${baseUrl}/index.php/${journal}/api/v1/submissions/${submissionId}/files/${fileId}/download`
      const apiRes = await fetchWithTimeout(apiUrl, { Authorization: `Bearer ${apiKey}` })

      if (apiRes.ok && apiRes.status === 200 && (apiRes.headers.get('content-type') || '').includes('pdf')) {
        return handleOjsResponse(apiRes, apiUrl)
      }
      console.warn(`[PDF Proxy] REST API failed or not PDF (${apiRes.status}), falling back to web download URL`)
    }

    // Strategy 2: Standard web download URL (galleyId)
    const webRes = await fetchWithTimeout(webDownloadUrl)
    return handleOjsResponse(webRes, webDownloadUrl)

  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[PDF Proxy] Request timed out")
      return new NextResponse("OJS server did not respond in time", { status: 504 })
    }
    console.error("[PDF Proxy] Network error:", error)
    return new NextResponse("Internal Server Error while proxying PDF", { status: 500 })
  }
}
