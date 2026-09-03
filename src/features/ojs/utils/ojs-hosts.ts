/**
 * Single source of truth for OJS host classifications.
 *
 * Defines canonical, alias, and dead hostnames used across both server-side
 * utilities (rewrite-inline-images, image-proxy route) and client-side
 * components (<OjsImage>).
 */

/**
 * End-state public base URL for the OJS install.
 */
export const DEFAULT_OJS_LANDING_BASE_URL = "https://journals.digitopub.com"

export const CANONICAL_OJS_HOST = new URL(DEFAULT_OJS_LANDING_BASE_URL).hostname

export const OJS_ALIAS_HOSTS = new Set<string>([
  "submitmanager.com",
  "www.submitmanager.com",
  "ij-mp.com",
  "www.ij-mp.com",
  "digitodontics.com",
  "www.digitodontics.com",
])

export const DEAD_EXTERNAL_HOSTS = new Set<string>([
  "journals.zu.edu.ly",
  "jtr.cit.edu.ly",
])

/**
 * Returns all hostnames recognized as part of the OJS installation (canonical + aliases + env overrides).
 * Used by image proxy allowlists and host validation.
 */
export function getAllOjsHostnames(): Set<string> {
  const hosts = new Set<string>([CANONICAL_OJS_HOST])

  // Add alias hosts
  for (const alias of OJS_ALIAS_HOSTS) {
    hosts.add(alias)
  }

  // Add environment hostnames if present
  const tryAdd = (url: string | null | undefined) => {
    if (!url) return
    try {
      hosts.add(new URL(url).hostname)
    } catch {
      // ignore invalid URLs in env
    }
  }

  tryAdd(process.env.OJS_BASE_URL)
  tryAdd(process.env.PUBLIC_OJS_BASE_URL)
  tryAdd(process.env.NEXT_PUBLIC_OJS_BASE_URL)

  return hosts
}

/**
 * Check if a hostname belongs to an OJS host (canonical, alias, or env override).
 */
export function isOjsHost(hostname: string): boolean {
  if (!hostname) return false
  const lower = hostname.toLowerCase()
  if (lower === CANONICAL_OJS_HOST) return true
  if (OJS_ALIAS_HOSTS.has(lower)) return true

  const allHosts = getAllOjsHostnames()
  return allHosts.has(lower)
}
