import { NextResponse } from "next/server"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const journal = searchParams.get('journal')
  const submissionId = searchParams.get('submissionId')
  const fileId = searchParams.get('fileId')

  // Validation & Sanitization
  if (!journal || !submissionId || !fileId) {
    return new NextResponse('Missing required parameters', { status: 400 })
  }

  const ID_PATTERN = /^\d+$/
  const JOURNAL_PATTERN = /^[A-Za-z0-9._-]+$/

  if (!ID_PATTERN.test(submissionId) || !ID_PATTERN.test(fileId) || !JOURNAL_PATTERN.test(journal)) {
    return new NextResponse('Invalid parameter format', { status: 400 })
  }

  const baseUrl = getOjsBaseUrl()
  const apiKey = process.env.OJS_API_KEY

  // Construct standard OJS REST API download link
  // If API key is present, use it in the Authorization header to bypass restrictions.
  let targetUrl = `${baseUrl}/index.php/${journal}/api/v1/submissions/${submissionId}/files/${fileId}/download`
  
  if (!apiKey) {
    // Fallback directly to regular download if no API key is specified (might trigger login redirect on OJS side if restricted)
    targetUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${fileId}?inline=1`
  }

  const FETCH_TIMEOUT = 15000 // 15 seconds

  const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const headers: Record<string, string> = {
        "User-Agent": "SPC-KIT-Server-Proxy",
        ...(options.headers as Record<string, string>),
      }

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`
      }

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })
      return res
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    const response = await fetchWithTimeout(targetUrl)

    if (!response.ok) {
      console.error(`[PDF Proxy] Failed to fetch PDF from OJS: ${response.status} ${response.statusText}`)
      
      // Try fallback to standard web download endpoint (without credentials)
      const fallbackUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${fileId}?inline=1`
      const fallbackResponse = await fetchWithTimeout(fallbackUrl)
      
      if (!fallbackResponse.ok) {
        return new NextResponse(`OJS file request failed: ${fallbackResponse.status}`, { status: fallbackResponse.status })
      }
      
      return new NextResponse(fallbackResponse.body, {
        headers: {
          "Content-Type": fallbackResponse.headers.get("Content-Type") || "application/pdf",
          "Content-Disposition": `inline; filename="article-${submissionId}.pdf"`,
        },
      })
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/pdf",
        "Content-Disposition": `inline; filename="article-${submissionId}.pdf"`,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("[PDF Proxy] Request timed out")
      return new NextResponse('OJS server did not respond in time', { status: 504 })
    }
    console.error("[PDF Proxy] Network error:", error)
    return new NextResponse('Internal Server Error while proxying PDF', { status: 500 })
  }
}
