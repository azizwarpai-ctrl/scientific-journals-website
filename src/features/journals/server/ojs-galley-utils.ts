import { getPublicOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

export function buildGalleyDownloadUrl(
  remoteUrl: string | null,
  journalUrlPath: string | null,
  submissionId: number,
  galleyId: number,
  inline: boolean = false
): string | null {
  if (remoteUrl) {
    return remoteUrl
  }

  const baseUrl = getPublicOjsBaseUrl()
  if (!baseUrl || !journalUrlPath) {
    return null
  }

  const url = `${baseUrl}/index.php/${journalUrlPath}/article/download/${submissionId}/${galleyId}`
  return inline ? `${url}?inline=1` : url
}
