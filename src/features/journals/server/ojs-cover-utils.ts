/**
 * Shared OJS Cover Image Utilities
 *
 * Extracted from current-issue-service.ts so both current-issue and archive
 * services can reuse the same cover image parsing and URL construction logic.
 *
 * OJS stores cover images in EAV settings tables (issue_settings, publication_settings)
 * with setting_name='coverImage'. The setting_value can be:
 * 1. JSON (newer OJS): {"en_US":{"uploadName":"cover.png","altText":""}}
 * 2. PHP serialized (older OJS): a:2:{s:10:"uploadName";s:12:"filename.png"...}
 * 3. Plain string: cover_issue_1_en_US.png
 *
 * URL pattern: {OJS_BASE_URL}/public/journals/{journal_id}/{filename}
 */

import path from "node:path"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

function findUploadName(obj: any): string | null {
  if (obj === null || typeof obj !== "object") return null
  if (typeof obj.uploadName === "string" && obj.uploadName) return obj.uploadName

  for (const key of Object.keys(obj)) {
    const found = findUploadName(obj[key])
    if (found) return found
  }
  return null
}

/**
 * Extracts the filename from a raw OJS coverImage setting value.
 * OJS can store covers as plain strings, JSON, or PHP serialized arrays.
 */
export function parseOjsCoverFilename(raw: string | null): string | null {
  if (!raw) return null

  // 1. JSON Format (Newer OJS versions) -> {"en_US":{"uploadName":"cover.png"}} or similar
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw)
      const found = findUploadName(parsed)
      if (found) return found

      // Secondary simplistic scan just in case
      if (parsed?.uploadName) return parsed.uploadName
      for (const key in parsed) {
        if (parsed[key]?.uploadName) return parsed[key].uploadName
      }
    } catch {
      // Move to next check if parse fails
    }
  }

  // 2. PHP Serialized Array (Older OJS versions) -> a:2:{s:10:"uploadName";s:12:"filename.png"...}
  if (raw.includes('uploadName";s:')) {
    const match = raw.match(/uploadName";s:\d+:"([^"]+)"/)
    if (match && match[1]) return match[1]
  }

  // 3. Plain String (Direct filename starting with convention)
  if (raw.match(/^(cover_issue_|article_|cover_)/)) {
    return raw
  }

  // Fallback: assume the raw string is the filename if it ends in standard extensions
  if (raw.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    return raw.trim()
  }

  return null
}

export function buildCoverUrl(journalId: number, filename: string | null): string | null {
  if (!filename) return null
  const baseUrl = getOjsBaseUrl()
  // Sanitize filename to prevent path traversal and ensure valid URL
  const sanitizedFilename = encodeURIComponent(path.basename(filename))
  return `${baseUrl}/public/journals/${journalId}/${sanitizedFilename}`
}
