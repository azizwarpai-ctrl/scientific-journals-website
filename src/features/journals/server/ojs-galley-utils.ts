/**
 * OJS `issues.access_status` constants.
 *
 *   1 = ISSUE_ACCESS_OPEN        (explicit open access)
 *   2 = ISSUE_ACCESS_SUBSCRIPTION (explicit subscription)
 *
 * Source: OJS `classes/issue/Issue.inc.php`
 */
export const ISSUE_ACCESS_OPEN = 1

export function isOpenAccessStatus(accessStatus: number | null | undefined): boolean {
  return accessStatus === ISSUE_ACCESS_OPEN
}

/**
 * Builds the clean public PDF URL on digitopub:
 * `/journals/{journalUrlPath}/articles/{publicationId}/pdf`
 *
 * Serves the PDF stream directly without `/api/` robots restrictions,
 * allowing discovery crawlers (Google Scholar) to index the PDF.
 */
export function buildArticlePdfUrl(
  journalUrlPath: string,
  publicationId: number | string
): string {
  return `/journals/${encodeURIComponent(journalUrlPath)}/articles/${encodeURIComponent(String(publicationId))}/pdf`
}

/**
 * Builds the URL the browser loads when viewing a galley PDF (legacy proxy).
 *
 *   1. `remoteUrl` set — passthrough to external URL (external galley).
 *   2. `journalUrlPath` or `submissionFileId` missing — returns null, signaling
 *      callers to hide the "View PDF" link.
 *   3. Otherwise — same-origin `/api/pdf-proxy?…` which fetches OJS's
 *      `/article/download/{s}/{g}/{f}` server-side and re-emits the PDF
 *      with `Content-Disposition: inline`.
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

  if (!submissionFileId) {
    return null
  }

  const params = new URLSearchParams({
    journal: journalUrlPath,
    submissionId: String(submissionId),
    galleyId: String(galleyId),
    fileId: String(submissionFileId),
  })
  return `/api/pdf-proxy?${params.toString()}`
}
