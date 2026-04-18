import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

/**
 * Fetch affiliations from OJS 3.4+ `author_affiliations` / `author_affiliation_settings`
 * tables for a batch of author IDs. Silently returns `[]` if the tables don't
 * exist (older OJS instances).
 */
export async function fetchNewAuthorAffiliations(
  authorIds: number[]
): Promise<Array<{ author_id: number; locale: string; setting_value: string }>> {
  if (authorIds.length === 0) return []
  try {
    return await ojsQuery<{
      author_id: number
      locale: string
      setting_value: string
    }>(
      `SELECT aa.author_id, aas.locale, aas.setting_value
       FROM author_affiliations aa
       JOIN author_affiliation_settings aas
         ON aas.author_affiliation_id = aa.author_affiliation_id
        AND aas.setting_name = 'name'
       WHERE aa.author_id IN (${authorIds.join(",")})`
    )
  } catch {
    // Older OJS versions don't have these tables
    return []
  }
}

/**
 * Pick the best localized value for an author: primary locale → en_US/en →
 * empty locale → first non-empty.
 */
function pickLocalized<T extends { locale: string; setting_value: string }>(
  rows: T[],
  primaryLocale: string
): string | null {
  if (rows.length === 0) return null
  const primary = rows.find((r) => r.locale === primaryLocale)
  if (primary?.setting_value) return primary.setting_value
  const en = rows.find((r) => r.locale === "en_US" || r.locale === "en")
  if (en?.setting_value) return en.setting_value
  const empty = rows.find((r) => r.locale === "")
  if (empty?.setting_value) return empty.setting_value
  return rows[0]?.setting_value || null
}

/**
 * Resolve the display affiliation for a single author. Prefers the newer
 * `author_affiliations` table (OJS 3.4+) and falls back to the legacy
 * `author_settings.affiliation` key. Keeps the detail page and the current
 * issue / archive views in lockstep so authors never show "Affiliation not
 * provided" on one surface while appearing correctly on another.
 */
export function resolveAuthorAffiliation(params: {
  authorId: number
  primaryLocale: string
  newAffiliationRows: Array<{ author_id: number; locale: string; setting_value: string }>
  legacySettings: Array<{ setting_name: string; locale: string; setting_value: string | null }>
}): string | null {
  const { authorId, primaryLocale, newAffiliationRows, legacySettings } = params

  const newForAuthor = newAffiliationRows.filter((r) => r.author_id === authorId)
  const fromNew = pickLocalized(newForAuthor, primaryLocale)
  if (fromNew) return fromNew

  const legacyRows = legacySettings
    .filter((s) => s.setting_name === "affiliation" && s.setting_value)
    .map((s) => ({ locale: s.locale, setting_value: s.setting_value as string }))
  return pickLocalized(legacyRows, primaryLocale)
}
