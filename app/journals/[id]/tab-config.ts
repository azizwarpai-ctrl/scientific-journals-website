/**
 * Journal detail tab configuration & route resolution — client- and
 * server-safe.
 *
 * Maps the five journal-detail tabs to their URL path segments and resolves
 * catch-all route segments back into a tab selection:
 *   - the route (`[id]/[...tab]/page.tsx`, server) calls `resolveTabSegments`
 *   - the view (`journal-detail-view.tsx`, client) calls `journalTabPath`
 *
 * Keeping both directions here makes this the single source of truth for
 * journal tab routing, and keeps the logic unit-testable in isolation.
 */

import { isValidPolicySlug } from "@/src/features/journals/policy-slugs"

export type JournalDetailTab = "about" | "author" | "current" | "archive" | "policies"

/**
 * URL path segment for each tab. About is the journal landing page itself
 * (`/journals/{id}`), so it has no segment.
 */
export const TAB_SEGMENTS: Record<JournalDetailTab, string> = {
  about: "",
  author: "author-guidelines",
  current: "current-issue",
  archive: "archive",
  policies: "policies",
}

/** Reverse lookup: URL path segment → tab key. Excludes About (the index). */
export const SEGMENT_TO_TAB: Record<string, JournalDetailTab> = {
  "author-guidelines": "author",
  "current-issue": "current",
  archive: "archive",
  policies: "policies",
}

/** Human-readable section name, used in `<title>` metadata. */
export const TAB_TITLES: Record<JournalDetailTab, string> = {
  about: "About",
  author: "Author Guidelines",
  current: "Current Issue",
  archive: "Archive",
  policies: "Journal Policies",
}

/** Build the path for a journal tab. About resolves to the journal root. */
export function journalTabPath(id: string, tab: JournalDetailTab): string {
  const segment = TAB_SEGMENTS[tab]
  return segment ? `/journals/${id}/${segment}` : `/journals/${id}`
}

export interface ResolvedTab {
  tab: JournalDetailTab
  /** Set only for `tab === "policies"` when a specific policy is requested. */
  policySlug: string | null
}

/**
 * Resolve the `[...tab]` catch-all segments into a tab key + optional policy
 * slug. Returns `null` when the URL does not map to a valid tab — the route
 * then renders a 404.
 *
 *   ["author-guidelines"]              → { tab: "author",   policySlug: null }
 *   ["policies"]                       → { tab: "policies", policySlug: null }
 *   ["policies", "privacy-statement"]  → { tab: "policies", policySlug: "privacy-statement" }
 *   ["policies", "bogus"]              → null  (unknown policy slug)
 *   ["archive", "extra"]               → null  (non-policies tab can't nest)
 *   ["bogus-tab"]                      → null  (unknown segment)
 *   ["policies", "x", "y"]             → null  (too deep)
 */
export function resolveTabSegments(segments: string[]): ResolvedTab | null {
  const [mainSegment, subSegment, ...rest] = segments
  if (rest.length > 0) return null

  const tab = SEGMENT_TO_TAB[mainSegment]
  if (!tab) return null

  if (tab === "policies") {
    if (subSegment === undefined) return { tab, policySlug: null }
    if (!isValidPolicySlug(subSegment)) return null
    return { tab, policySlug: subSegment }
  }

  // Non-policies tabs never carry a sub-segment.
  if (subSegment !== undefined) return null
  return { tab, policySlug: null }
}
