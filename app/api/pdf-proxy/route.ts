import { NextResponse } from "next/server"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const journal = searchParams.get('journal')
  const submissionId = searchParams.get('submissionId')
  const fileId = searchParams.get('fileId')

  if (!journal || !submissionId || !fileId) {
    return new NextResponse('Missing required parameters', { status: 400 })
  }

  const baseUrl = getOjsBaseUrl()
  const apiKey = process.env.OJS_API_KEY

  // Construct standard OJS REST API download link
  // If API key is present, use it to bypass potential login restrictions.
  let targetUrl = `${baseUrl}/index.php/${journal}/api/v1/submissions/${submissionId}/files/${fileId}/download`
  if (apiKey) {
    targetUrl += `?apiToken=${apiKey}`
  } else {
    // Fallback directly to regular download if no API key is specified (might trigger login redirect on OJS side if restricted)
    targetUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${fileId}?inline=1`
  }

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "SPC-KIT-Server-Proxy",
      },
    })

    if (!response.ok) {
      console.error(`[PDF Proxy] Failed to fetch PDF from OJS: ${response.status} ${response.statusText}`)
      // Try fallback to standard web download endpoint
      const fallbackUrl = `${baseUrl}/index.php/${journal}/article/download/${submissionId}/${fileId}?inline=1`
      const fallbackResponse = await fetch(fallbackUrl, {
        method: "GET",
        headers: { "User-Agent": "SPC-KIT-Server-Proxy" },
      })
      
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
  } catch (error) {
    console.error("[PDF Proxy] Network error:", error)
    return new NextResponse('Internal Server Error while proxying PDF', { status: 500 })
  }
}
