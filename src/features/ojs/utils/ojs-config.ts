/**
 * Centralized utility for OJS configuration access.
 *
 * Single source of truth for every OJS hostname/URL the app touches. New code
 * MUST go through these helpers — no `submitmanager.com` / `journals.digitopub.com`
 * literals in app/src code (comments excepted).
 */

/**
 * End-state public hostname for the OJS install. Used as a safe default when
 * `NEXT_PUBLIC_OJS_BASE_URL` is not inlined into a client bundle and as a
 * baseline entry for the image-proxy / <OjsImage> allowlist so cutover-window
 * URLs continue to render while the apex env is still pre-flip.
 */
export const DEFAULT_OJS_LANDING_BASE_URL = "https://journals.digitopub.com"

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
 * OJS serves public files from the document root (e.g. `<host>/public/...`),
 * even when the OJS application itself lives under a subpath like `/ojs`. Strip a
 * trailing `/ojs` segment so cover URLs resolve regardless of which form
 * OJS_BASE_URL takes.
 */
export function getOjsPublicAssetsBaseUrl(): string {
  return getOjsBaseUrl().replace(/\/ojs$/i, "")
}

/**
 * Defensive read-time fix-up for URLs persisted by earlier syncs that wrote
 * `<host>/ojs/public/...` paths. The OJS public files directory is served from
 * the document root, so the `/ojs` segment makes the upstream return 500.
 * Idempotent: URLs already in the correct shape pass through unchanged.
 */
export function normalizeOjsAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/\/ojs\/public\//i, "/public/")
}

/**
 * Build the canonical OJS article landing URL — the page that carries
 * Highwire `citation_*` metadata and is the Google-Scholar record. Used by the
 * apex article page as `<link rel="canonical">` so the apex defers all
 * scholarly authority to the OJS host.
 *
 * Pattern: `${publicOjsBase}/index.php/{journalUrlPath}/article/view/{submissionId}`.
 * `submissionId` is the OJS `submission_id`, NOT the route `[publicationId]`.
 *
 * Falls back to `DEFAULT_OJS_LANDING_BASE_URL` when no env var is set so the
 * canonical is always a real, absolute URL even in client bundles where only
 * `NEXT_PUBLIC_*` is inlined and a dev forgot to set it.
 */
export function buildOjsArticleLandingUrl(
  journalUrlPath: string,
  submissionId: number | string
): string {
  const base = (getPublicOjsBaseUrl() ?? DEFAULT_OJS_LANDING_BASE_URL).replace(/\/ojs$/i, "")
  const slug = encodeURIComponent(journalUrlPath)
  return `${base}/index.php/${slug}/article/view/${submissionId}`
}

/**
 * Build the clean OJS article download URL — the same-host PDF endpoint the
 * Google-Scholar crawler hits via `citation_pdf_url`, and the URL the apex
 * exposes to humans for "Download" / "Open in new tab" actions.
 *
 * Pattern: `${publicOjsBase}/{journalUrlPath}/article/download/{submissionId}/{galleyId}`.
 * Note the 2-arg form (no fileId) — OJS resolves the file from the galley.
 *
 * Use this for human-visible buttons and any citable/shareable link. The
 * apex's embedded inline viewer still uses `/api/pdf-proxy?…` because OJS
 * unconditionally serves `Content-Disposition: attachment`, which the proxy
 * rewrites to `inline` so the PDF renders inside the iframe instead of
 * triggering a download.
 */
export function buildOjsArticleDownloadUrl(
  journalUrlPath: string,
  submissionId: number | string,
  galleyId: number | string
): string {
  const base = (getPublicOjsBaseUrl() ?? DEFAULT_OJS_LANDING_BASE_URL).replace(/\/ojs$/i, "")
  const slug = encodeURIComponent(journalUrlPath)
  return `${base}/${slug}/article/download/${submissionId}/${galleyId}`
}

/**
 * Hostnames the app is allowed to fetch OJS assets from. Derived from the
 * configured base URLs plus the end-state default so the allowlist stays
 * valid through every step of the cutover window:
 *
 *   - pre-flip: env points at the legacy host → that host is allowed.
 *   - post-flip, pre-apex-deploy: OJS emits the new host but env still has
 *     the legacy one. The default keeps the new host allowed.
 *   - post-apex-deploy: env points at the new host → covered both ways.
 *
 * Invalid URLs in env are silently skipped so a misconfigured value can't
 * brick the proxy.
 */
export function getOjsHostnames(): Set<string> {
  const hosts = new Set<string>()
  const tryAdd = (url: string | null | undefined) => {
    if (!url) return
    try {
      hosts.add(new URL(url).hostname)
    } catch {
      // ignore malformed env values
    }
  }
  tryAdd(process.env.OJS_BASE_URL)
  tryAdd(process.env.PUBLIC_OJS_BASE_URL)
  tryAdd(process.env.NEXT_PUBLIC_OJS_BASE_URL)
  tryAdd(DEFAULT_OJS_LANDING_BASE_URL)
  return hosts
}
