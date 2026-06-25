/**
 * Server-side rewriter for inline <img> tags in OJS-authored HTML.
 *
 * OJS content (policies, custom blocks) contains <img src="…"> tags pointing
 * at legacy/stale hosts. The browser fetches these directly, bypassing
 * <OjsImage> / /api/image-proxy, and gets HTML or 0 bytes back from WAF /
 * dead servers. This module rewrites those src URLs at sanitization time so
 * they never reach the client in their raw form.
 *
 * Three buckets:
 *   OJS_ALIAS_HOSTS — legacy hostnames that served the same OJS install.
 *     Rewrite to the canonical host, normalize /ojs/public/ → /public/,
 *     then wrap in /api/image-proxy?url=… so the proxy defeats the WAF.
 *   DEAD_EXTERNAL_HOSTS — third-party hosts confirmed 404 / unreachable.
 *     Remove the <img> tag entirely.
 *   Everything else — leave untouched (external CDN, data: URI, already
 *     canonical, unknown host). Log unknown external hosts once per process.
 */

import {
  DEFAULT_OJS_LANDING_BASE_URL,
  normalizeOjsAssetUrl,
} from "./ojs-config"

// ── Host classifications ─────────────────────────────────────────────────────

export const CANONICAL_OJS_HOST = new URL(DEFAULT_OJS_LANDING_BASE_URL).hostname

export const OJS_ALIAS_HOSTS = new Set([
  "submitmanager.com",
  "www.submitmanager.com",
  "ij-mp.com",
  "www.ij-mp.com",
  "digitodontics.com",
  "www.digitodontics.com",
])

export const DEAD_EXTERNAL_HOSTS = new Set([
  "journals.zu.edu.ly",
  "jtr.cit.edu.ly",
])

const warnedHosts = new Set<string>()

// ── Core rewriter ────────────────────────────────────────────────────────────

/**
 * Rewrite <img src="…"> URLs in sanitized OJS HTML.
 *
 * Pure function (no I/O). Handles:
 * - Standard `src="…"` and single-quoted `src='…'`
 * - Escaped `\/` slashes from JSON-stored blockContent
 * - Multiple <img> tags in one string
 * - Srcless / malformed <img> (no crash, left as-is)
 * - data: URIs (left untouched)
 * - Already-canonical host (wrapped in proxy, not double-wrapped)
 */
export function rewriteOjsInlineImages(html: string): string {
  if (!html) return html

  // Unescape JSON-encoded forward slashes before processing, then re-escape
  // if the input contained them. In practice sanitize-html output never has
  // escaped slashes, but blockContent JSON payloads sometimes do before
  // sanitization. The caller should apply this AFTER sanitize-html (which
  // already unescapes), so the re-escape branch is defensive only.
  const hadEscapedSlashes = html.includes("\\/")
  const working = hadEscapedSlashes ? html.replace(/\\\//g, "/") : html

  const result = working.replace(
    /<img\b([^>]*)>/gi,
    (_fullMatch, attrsStr: string) => {
      const srcMatch = attrsStr.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
      if (!srcMatch) {
        return _fullMatch
      }

      const originalSrc = srcMatch[1] ?? srcMatch[2] ?? ""
      if (!originalSrc) return _fullMatch

      const rewritten = rewriteSrc(originalSrc)
      if (rewritten === null) {
        return ""
      }
      if (rewritten === originalSrc) {
        return _fullMatch
      }

      const newAttrs = attrsStr.replace(
        /\bsrc\s*=\s*(?:"[^"]*"|'[^']*')/i,
        `src="${escapeAttr(rewritten)}"`,
      )
      return `<img${newAttrs}>`
    },
  )

  return hadEscapedSlashes ? result.replace(/\//g, "\\/") : result
}

// ── Per-src logic ────────────────────────────────────────────────────────────

/**
 * Returns:
 *   string — the rewritten src (may equal input if already correct)
 *   null   — remove the <img> entirely
 */
function rewriteSrc(src: string): string | null {
  if (src.startsWith("data:")) return src

  if (src.startsWith("/api/image-proxy")) return src

  let parsed: URL
  try {
    parsed = new URL(src)
  } catch {
    return src
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return src

  const hostname = parsed.hostname.toLowerCase()

  if (DEAD_EXTERNAL_HOSTS.has(hostname)) {
    return null
  }

  if (OJS_ALIAS_HOSTS.has(hostname)) {
    const canonicalUrl = `https://${CANONICAL_OJS_HOST}${parsed.pathname}${parsed.search}`
    const normalized = normalizeOjsAssetUrl(canonicalUrl) ?? canonicalUrl
    return `/api/image-proxy?url=${encodeURIComponent(normalized)}`
  }

  if (hostname === CANONICAL_OJS_HOST) {
    const normalized = normalizeOjsAssetUrl(src) ?? src
    return `/api/image-proxy?url=${encodeURIComponent(normalized)}`
  }

  if (!warnedHosts.has(hostname)) {
    warnedHosts.add(hostname)
    console.warn(
      `[rewrite-inline-images] Unknown external host in <img src>: ${hostname} — leaving untouched`,
    )
  }
  return src
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}
