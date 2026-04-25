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
 * Builds the URL the browser loads when viewing a galley PDF.
 *
 *   1. `remote_url` set — passthrough (external galley).
 *   2. `submissionFileId` missing — returns null so callers hide the
 *      "View PDF" link; the proxy needs fileId for the 3-arg upstream
 *      download URL.
 *   3. Otherwise — same-origin `/api/pdf-proxy?…` which fetches OJS's
 *      `/article/download/{s}/{g}/{f}` server-side and re-emits the PDF
 *      with `Content-Disposition: inline`. OJS itself returns
 *      `attachment` on every file URL, which forces a Save-As dialog
 *      and prevents in-iframe rendering. Proxying lets us normalize
 *      the disposition header and render inline.
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
