/**
 * Centralized utility for OJS configuration access.
 */

export function getOjsBaseUrl(): string {
  const baseUrl = process.env.OJS_BASE_URL || process.env.NEXT_PUBLIC_OJS_BASE_URL

  if (!baseUrl) {
    throw new Error(
      "OJS_BASE_URL or NEXT_PUBLIC_OJS_BASE_URL environment variable is missing but required for OJS integration."
    )
  }

  // Remove trailing slash if present
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

/**
 * Returns the public-facing OJS URL for browser links (e.g. downloads, new tabs).
 * Separate from internal server-to-server OJS_BASE_URL to avoid leaking local network addresses.
 */
export function getPublicOjsBaseUrl(): string | null {
  const publicUrl = process.env.PUBLIC_OJS_BASE_URL || process.env.NEXT_PUBLIC_OJS_BASE_URL

  if (!publicUrl) return null

  return publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl
}

/**
 * Base URL for OJS public assets (cover images, profile images, etc.).
 * OJS serves public files from the document root (e.g. submitmanager.com/public/...),
 * even when the OJS application itself lives under a subpath like `/ojs`. Strip a
 * trailing `/ojs` segment so cover URLs resolve regardless of which form
 * OJS_BASE_URL takes.
 */
export function getOjsPublicAssetsBaseUrl(): string {
  return getOjsBaseUrl().replace(/\/ojs$/i, "")
}
