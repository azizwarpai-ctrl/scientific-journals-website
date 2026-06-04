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

/**
 * Shape check applied to every candidate filename — extracted (JSON / PHP)
 * or plain. A name passes if it has a known OJS file prefix OR a known image
 * extension. Real OJS settings rows always satisfy this; the guard is
 * belt-and-suspenders against corrupted data so we never construct a URL
 * around garbage like `name: "<script>"`, `name: ""`, or `name: "subdir"`.
 */
const IMAGE_FILENAME_SHAPE = /^(cover_issue_|article_|cover_)|\.(jpg|jpeg|png|webp|gif|avif)$/i

function isImageFilename(value: unknown): value is string {
  return typeof value === "string" && IMAGE_FILENAME_SHAPE.test(value)
}

function findUploadName(obj: unknown): string | null {
  if (obj === null || typeof obj !== "object") return null
  const record = obj as Record<string, unknown>
  // Prefer 'name' (the actual file on disk in OJS 3.x) over 'uploadName' (the original uploaded filename)
  if (isImageFilename(record.name)) return record.name
  if (isImageFilename(record.uploadName)) return record.uploadName
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

  // 1. JSON — {"en_US":{"name":"cover.png"}} or {"uploadName":"photo.jpg"}
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      const found = findUploadName(parsed)
      if (found) return found
    } catch {
      // fall through
    }
  }

  // 2. PHP serialized — a:2:{s:4:"name";s:12:"filename.png"...}
  // Prefer 'name' first
  if (trimmed.includes('name";s:')) {
    const match = trimmed.match(/name";s:\d+:"([^"]+)"/)
    if (isImageFilename(match?.[1])) return match[1]
  }
  if (trimmed.includes('uploadName";s:')) {
    const match = trimmed.match(/uploadName";s:\d+:"([^"]+)"/)
    if (isImageFilename(match?.[1])) return match[1]
  }

  // 3. Plain string — same shape check as the JSON/PHP branches.
  if (isImageFilename(trimmed)) return trimmed

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
