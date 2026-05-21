/**
 * Canonical policy tab metadata — client- and server-safe.
 *
 * The full whitelist (with OJS aliases, journal_settings keys, built-in nav
 * menu types, etc.) lives in `server/journal-policies-service.ts`. This file
 * exports ONLY the URL-facing slug + title pairs so the client bundle never
 * has to pull in the OJS / mysql2 modules just to validate a URL segment.
 *
 * `journal-policies-service.ts` imports from THIS file to build its rich list
 * — making this the single source of truth for slug/title pairs.
 */

export interface PolicyMeta {
  readonly slug: string
  readonly title: string
}

export const POLICY_METADATA: readonly PolicyMeta[] = [
  { slug: "privacy-statement", title: "Privacy Statement" },
  { slug: "policies-on-ethics", title: "Policies on Ethics" },
  { slug: "copyright-licensing", title: "Copyright & Licensing Policies" },
  { slug: "editorial-workflow", title: "Editorial Workflow" },
  { slug: "indexing-archiving", title: "Indexing & Archiving" },
  { slug: "dois-orcid", title: "DOIs & ORCID" },
]

export const APPROVED_POLICY_SLUGS: readonly string[] = POLICY_METADATA.map(
  (p) => p.slug,
)

/** True when `slug` matches a canonical POLICY_METADATA.slug exactly. */
export function isValidPolicySlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  return APPROVED_POLICY_SLUGS.includes(slug)
}

/** Canonical human-readable title for a slug, or null if the slug is unknown. */
export function getPolicyTitleBySlug(slug: string): string | null {
  return POLICY_METADATA.find((p) => p.slug === slug)?.title ?? null
}
