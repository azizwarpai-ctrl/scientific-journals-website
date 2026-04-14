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
      })
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * OJS download URL strategies (in priority order):
   *
   * 1. REST API with API key — requires submission_file_id (fileId):
   *    /index.php/{journal}/api/v1/submissions/{sub}/files/{fileId}/download
   *
   * 2. Standard web download — uses galley_id (galleyId), no auth needed for open-access:
   *    /index.php/{journal}/article/download/{sub}/{galleyId}?inline=1
   *
   * Strategy 1 is tried when both apiKey and fileId are available.
   * Strategy 2 is always tried as the fallback (or primary when no API key).
   */
  const webDownloadUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${galleyId}?inline=1`

  const buildResponse = (res: Response) =>
    new NextResponse(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/pdf",
        "Content-Disposition": `inline; filename="article-${submissionId}.pdf"`,
        // Prevent browser from blocking the iframe
        "X-Frame-Options": "SAMEORIGIN",
      },
    })

  try {
    // Strategy 1: REST API with API key (only if key + fileId available)
    if (apiKey && fileId) {
      const apiUrl = `${baseUrl}/index.php/${journal}/api/v1/submissions/${submissionId}/files/${fileId}/download`
      const apiRes = await fetchWithTimeout(apiUrl, { Authorization: `Bearer ${apiKey}` })

      if (apiRes.ok) {
        return buildResponse(apiRes)
      }
      console.warn(`[PDF Proxy] REST API failed (${apiRes.status}), falling back to web download URL`)
    }

    // Strategy 2: Standard web download URL (galleyId)
    const webRes = await fetchWithTimeout(webDownloadUrl)

    if (!webRes.ok) {
      console.error(`[PDF Proxy] Web download failed: ${webRes.status} for ${webDownloadUrl}`)
      return new NextResponse(`OJS returned ${webRes.status}`, { status: webRes.status })
    }

    return buildResponse(webRes)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[PDF Proxy] Request timed out")
      return new NextResponse("OJS server did not respond in time", { status: 504 })
    }
    console.error("[PDF Proxy] Network error:", error)
    return new NextResponse("Internal Server Error while proxying PDF", { status: 500 })
  }
}
