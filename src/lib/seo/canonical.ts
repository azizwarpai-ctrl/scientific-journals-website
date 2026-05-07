const DEFAULT_APP_URL = "https://digitopub.com"

function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  return raw.replace(/\/+$/, "")
}

export function buildCanonical(path: string): string {
  const base = getAppUrl()
  if (!path || path === "/") return base
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalized.replace(/\/+$/, "")}`
}
