/**
 * OJS Cover Image Utilities — thin wrappers over the shared resolver.
 *
 * All parsing and URL-construction logic lives in
 * src/features/ojs/utils/ojs-asset-url.ts. These exports keep existing
 * call-sites unchanged.
 */

import { parseOjsFilename, buildOjsAssetUrl } from "@/src/features/ojs/utils/ojs-asset-url"

/** @deprecated Use parseOjsFilename from ojs-asset-url directly for new code. */
export function parseOjsCoverFilename(raw: string | null): string | null {
  return parseOjsFilename(raw)
}

export function buildCoverUrl(journalId: number, filename: string | null): string | null {
  return buildOjsAssetUrl(`public/journals/${journalId}`, filename)
}
