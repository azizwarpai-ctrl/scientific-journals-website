export interface IssueMetadata {
  title?: string | null
  showTitle?: boolean | null
  volume?: number | null
  showVolume?: boolean | null
  number?: string | null
  showNumber?: boolean | null
  year?: number | null
  showYear?: boolean | null
}

export const getIssueTitle = (iss: IssueMetadata): string => {
  if (iss.showTitle && iss.title) return iss.title

  const parts: string[] = []
  if (iss.showVolume && iss.volume) parts.push(`Vol. ${iss.volume}`)
  if (iss.showNumber && iss.number) parts.push(`No. ${iss.number}`)
  const titleBase = parts.join(", ")

  return iss.showYear && iss.year
    ? `${titleBase}${titleBase ? " " : ""}(${iss.year})`
    : titleBase || "Issue Detail"
}

export const getIssueSubtitle = (iss: IssueMetadata): string | null => {
  if (!iss.showTitle || !iss.title) return null
  if (!iss.showVolume && !iss.showNumber && !iss.showYear) return null

  const parts: string[] = []
  if (iss.showVolume && iss.volume) parts.push(`Vol. ${iss.volume}`)
  if (iss.showNumber && iss.number) parts.push(`No. ${iss.number}`)
  const subtitleBase = parts.join(", ")

  return iss.showYear && iss.year
    ? `${subtitleBase}${subtitleBase ? " " : ""}(${iss.year})`
    : subtitleBase
}
