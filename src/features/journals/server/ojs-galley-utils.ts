/**
 * Builds the URL the browser loads when viewing a galley PDF.
 *
 * - Remote-hosted galleys (OJS `remote_url`) are returned verbatim.
 * - Locally-stored galleys are routed through our same-origin
 *   `/api/pdf-proxy`. The proxy authenticates to OJS server-side with
 *   `OJS_API_KEY` + the OJS REST API (preferred) and falls back to the
 *   public web galley URL with browser-like headers — this bypasses the
 *   session/hotlink gate OJS applies to direct-browser requests.
 */
export function buildGalleyDownloadUrl(
  remoteUrl: string | null,
  journalUrlPath: string | null,
  submissionId: number,
  galleyId: number,
  submissionFileId: number | null
): string | null {
  if (remoteUrl) {
    return remoteUrl
  }

  if (!journalUrlPath) {
    return null
  }

  const params = new URLSearchParams({
    journal: journalUrlPath,
    submissionId: String(submissionId),
    galleyId: String(galleyId),
  })
  if (submissionFileId) {
    params.set("fileId", String(submissionFileId))
  }
  return `/api/pdf-proxy?${params.toString()}`
}
