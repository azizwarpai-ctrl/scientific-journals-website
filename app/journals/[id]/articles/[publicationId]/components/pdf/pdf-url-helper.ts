/**
 * If pdfDirectUrl is not provided, derive a direct OJS download URL from
 * the proxy URL's query parameters. This guarantees the iframe always loads
 * the OJS URL directly (browser handles SiteGround WAF) and never our
 * server-side proxy (which SiteGround blocks with a JS challenge).
 */
export function deriveDirectUrl(proxyUrl: string | null): string | null {
  if (!proxyUrl || !proxyUrl.startsWith("/api/pdf-proxy")) return null
  const ojsBase = process.env.NEXT_PUBLIC_OJS_BASE_URL
  if (!ojsBase) return null
  try {
    const params = new URL(proxyUrl, "http://localhost").searchParams
    const journal = params.get("journal")
    const submissionId = params.get("submissionId")
    const galleyId = params.get("galleyId")
    if (!journal || !submissionId || !galleyId) return null
    const base = ojsBase.endsWith("/") ? ojsBase.slice(0, -1) : ojsBase
    return `${base}/index.php/${journal}/article/download/${submissionId}/${galleyId}?inline=1`
  } catch {
    return null
  }
}

/**
 * Appends PDF viewer hints to a URL to ensure it opens in a suitable
 * state in the iframe.
 */
export function getIframeSrc(viewUrl: string | null): string {
  if (!viewUrl) return ""
  const joiner = viewUrl.includes("#") ? "&" : "#"
  return `${viewUrl}${joiner}toolbar=1&navpanes=1&scrollbar=1&view=FitH`
}
