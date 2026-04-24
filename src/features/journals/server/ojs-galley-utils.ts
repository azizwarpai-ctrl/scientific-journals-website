/**
 * Builds the URL the browser loads when viewing a galley PDF.
 *
 * Resolution order:
 *   1. `remote_url` (OJS external galley) — passthrough.
 *   2. Open-access + `submissionFileId` + `publicOjsBaseUrl` — direct OJS
 *      stream URL using the 3-arg form `/article/download/{s}/{g}/{f}`. OJS
 *      serves published open-access files anonymously at this path; no
 *      proxy round-trip needed.
 *   3. Everything else — routed through same-origin `/api/pdf-proxy`, which
 *      re-emits the PDF server-side to bypass OJS session / hotlink gates.
 *
 * OJS `issues.access_status`:
 *   0 = default (journal policy), 1 = open access, 2 = subscription.
 * We treat 0 and 1 (and NULL) as open-access; only 2 falls through to the
 * proxy.
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

  const isOpenAccess = accessStatus === null || accessStatus === 0 || accessStatus === 1
  if (isOpenAccess && submissionFileId && publicOjsBaseUrl) {
    const base = publicOjsBaseUrl.endsWith("/") ? publicOjsBaseUrl.slice(0, -1) : publicOjsBaseUrl
    return `${base}/index.php/${journalUrlPath}/article/download/${submissionId}/${galleyId}/${submissionFileId}`
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
