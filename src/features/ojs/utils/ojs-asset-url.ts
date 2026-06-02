/**
 * Single source of truth for building OJS public-asset URLs.
 *
 * OJS stores image filenames in three formats depending on version:
 *   1. JSON:            {"en_US":{"uploadName":"cover.png"}} or {"uploadName":"photo.jpg"}
 *   2. PHP-serialized:  a:2:{s:10:"uploadName";s:9:"photo.jpg";...}
 *   3. Plain string:    cover_issue_1_en_US.png
 *
 * All resolvers in the codebase MUST go through `parseOjsFilename` +
 * `buildOjsAssetUrl` (or the low-level `buildOjsPublicUrl` for code that
 * already holds an explicit base URL, e.g. ojs-mappers.ts).
 */

import path from "node:path"
import { getOjsPublicAssetsBaseUrl, normalizeOjsAssetUrl } from "./ojs-config"

// ─── Filename parser ──────────────────────────────────────────────────────────

function findUploadName(obj: unknown): string | null {
  if (obj === null || typeof obj !== "object") return null
  const record = obj as Record<string, unknown>
  if (typeof record.uploadName === "string" && record.uploadName) return record.uploadName
  for (const key of Object.keys(record)) {
    const found = findUploadName(record[key])
    if (found) return found
  }
  return null
}

/**
 * Extracts the bare filename from any OJS image-setting value.
 * Handles JSON (nested or flat), PHP-serialized arrays, and plain strings.
 * Returns null for null/empty/unparseable input.
 */
export function parseOjsFilename(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // 1. JSON — {"en_US":{"uploadName":"cover.png"}} or {"uploadName":"photo.jpg"}
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      const found = findUploadName(parsed)
      if (found) return found
    } catch {
      // fall through
    }
  }

  // 2. PHP serialized — a:2:{s:10:"uploadName";s:12:"filename.png"...}
  if (trimmed.includes('uploadName";s:')) {
    const match = trimmed.match(/uploadName";s:\d+:"([^"]+)"/)
    if (match?.[1]) return match[1]
  }

  // 3. Plain string with a well-known OJS file-name prefix
  if (trimmed.match(/^(cover_issue_|article_|cover_)/)) return trimmed

  // 4. Plain string with a recognised image extension
  if (trimmed.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i)) return trimmed

  return null
}

// ─── URL builders ─────────────────────────────────────────────────────────────

/**
 * Low-level URL builder — accepts an explicit baseUrl so callers that already
 * hold the value (e.g. ojs-mappers.ts) don't re-read the env variable.
 *
 * `subpath` should be the path segment *between* the origin and the filename,
 * without leading or trailing slashes, e.g. `"public/journals/10"`.
 *
 * The filename is always basename-sanitised + percent-encoded to prevent path
 * traversal.
 */
export function buildOjsPublicUrl(baseUrl: string, subpath: string, filename: string): string {
  const clean = subpath.replace(/^\/|\/$/g, "")
  // Normalize backslashes so `path.basename` on Linux still strips Windows-style
  // traversal sequences like `..\..\secret.png` down to the leaf name.
  const normalized = filename.replace(/\\/g, "/")
  const sanitized = encodeURIComponent(path.basename(normalized))
  return `${baseUrl}/${clean}/${sanitized}`
}

/**
 * High-level URL builder — reads OJS_BASE_URL from the environment and calls
 * `buildOjsPublicUrl`. Returns null when `filename` is null/empty.
 */
export function buildOjsAssetUrl(subpath: string, filename: string | null | undefined): string | null {
  if (!filename) return null
  const baseUrl = getOjsPublicAssetsBaseUrl()
  const url = buildOjsPublicUrl(baseUrl, subpath, filename)
  // Defensive: strip any /ojs/ that leaked in from legacy env values
  return normalizeOjsAssetUrl(url)
}
