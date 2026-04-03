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
