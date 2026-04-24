/**
 * OJS `issues.access_status` constants.
 *
 *   1 = ISSUE_ACCESS_OPEN        (explicit open access)
 *   2 = ISSUE_ACCESS_SUBSCRIPTION (explicit subscription)
 *
 * Other values (including 0 and NULL) are treated conservatively as
 * "not explicitly open" — they may represent the journal-level default
 * or a legacy value, and whether that resolves to open depends on the
 * journal's subscription configuration. Routing those through the proxy
 * is the safe default; the proxy falls back gracefully if the resource
 * is in fact open.
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
 * Resolution order:
 *   1. `remote_url` (OJS external galley) — passthrough.
 *   2. Open-access + `submissionFileId` + `publicOjsBaseUrl` — direct OJS
 *      stream URL using the 3-arg form `/article/download/{s}/{g}/{f}`. OJS
 *      serves published open-access files anonymously at this path; no
 *      proxy round-trip needed.
 *   3. `submissionFileId` present but open-access conditions not met —
 *      routed through same-origin `/api/pdf-proxy`, which re-emits the PDF
 *      server-side to bypass OJS session / hotlink gates.
 *   4. No `submissionFileId` — returns `null` so callers hide the "View
 *      PDF" link. The proxy requires `fileId` for the 3-arg upstream
 *      download URL, so emitting a proxy URL without it would 400.
 */
export function buildGalleyDownloadUrl(
  remoteUrl: string | null,
  journalUrlPath: string | null,
  submissionId: number,
  galleyId: number,
  submissionFileId: number | null,
  accessStatus: number | null = null,
  publicOjsBaseUrl: string | null = null
): string | null {
  if (remoteUrl) {
    return remoteUrl
  }

  if (!journalUrlPath) {
    return null
  }

  if (isOpenAccessStatus(accessStatus) && submissionFileId && publicOjsBaseUrl) {
    const base = publicOjsBaseUrl.endsWith("/") ? publicOjsBaseUrl.slice(0, -1) : publicOjsBaseUrl
    return `${base}/index.php/${journalUrlPath}/article/download/${submissionId}/${galleyId}/${submissionFileId}`
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
