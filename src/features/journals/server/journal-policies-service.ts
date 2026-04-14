/**
 * Journal Policies Service
 *
 * Fetches editorial/legal policy text from the OJS journal_settings table.
 *
 * OJS stores all journal configuration in a key-value EAV (Entity-Attribute-Value)
 * table: journal_settings (journal_id, locale, setting_name, setting_value).
 *
 * SQL proof:
 *   SELECT setting_name, setting_value
 *   FROM journal_settings
 *   WHERE journal_id = ?
 *   AND setting_name IN ('privacyStatement','copyrightStatement','authorSelfArchivePolicy',
 *                        'reviewPolicy','openAccessPolicy','focusAndScope')
 *   AND (locale = ? OR locale = '')
 *
 * Why NOT publication_settings:
 *   publication_settings stores per-article metadata (title, abstract, doi).
 *   Journal-level policies live exclusively in journal_settings.
 */

import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

export interface JournalPolicies {
  privacyStatement: string | null
  copyrightStatement: string | null
  authorSelfArchivePolicy: string | null
  reviewPolicy: string | null
  openAccessPolicy: string | null
  /** Whether DOI registration is enabled for this journal (boolean stored as '0'/'1') */
  doiEnabled: boolean
  /** Whether ORCID collection is enabled */
  orcidEnabled: boolean
}

interface PolicyRow {
  setting_name: string
  setting_value: string | null
  locale: string
}

const POLICY_SETTING_NAMES = [
  "privacyStatement",
  "copyrightStatement",
  "authorSelfArchivePolicy",
  "reviewPolicy",
  "openAccessPolicy",
  "enableDois",
  "requireAuthorCompetingInterests",
]

/**
 * Returns the best locale value for a given setting name from a list of rows.
 * Priority: primaryLocale > '' (unlocalized) > any available locale
 */
function pickBestLocale(rows: PolicyRow[], settingName: string, primaryLocale: string): string | null {
  const matching = rows.filter((r) => r.setting_name === settingName)
  if (matching.length === 0) return null

  const localeMatch = matching.find((r) => r.locale === primaryLocale)
  if (localeMatch?.setting_value) return localeMatch.setting_value

  const unlocalized = matching.find((r) => r.locale === "")
  if (unlocalized?.setting_value) return unlocalized.setting_value

  return matching[0]?.setting_value ?? null
}

export async function fetchJournalPolicies(ojsJournalId: string): Promise<JournalPolicies> {
  const empty: JournalPolicies = {
    privacyStatement: null,
    copyrightStatement: null,
    authorSelfArchivePolicy: null,
    reviewPolicy: null,
    openAccessPolicy: null,
    doiEnabled: false,
    orcidEnabled: false,
  }

  if (!/^\d+$/.test(ojsJournalId)) return empty

  const journalId = parseInt(ojsJournalId, 10)

  // Resolve primary locale
  let primaryLocale = "en_US"
  try {
    const localeRows = await ojsQuery<{ primary_locale: string }>(
      "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
      [journalId]
    )
    if (localeRows.length > 0 && localeRows[0].primary_locale) {
      primaryLocale = localeRows[0].primary_locale
    }
  } catch {
    // Proceed with default
  }

  let rows: PolicyRow[] = []
  try {
    // Fetch all policy-relevant settings in a single query.
    // We request both the primary locale and '' (unlocalized) rows.
    const placeholders = POLICY_SETTING_NAMES.map(() => "?").join(", ")
    rows = await ojsQuery<PolicyRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name IN (${placeholders})
         AND (locale = ? OR locale = '')`,
      [journalId, ...POLICY_SETTING_NAMES, primaryLocale]
    )
  } catch (err) {
    console.error(`[JournalPolicies] Failed to fetch policies for journal_id=${journalId}:`, err)
    return empty
  }

  const doiRaw = pickBestLocale(rows, "enableDois", primaryLocale)
  const orcidRow = rows.find((r) => r.setting_name === "requireAuthorCompetingInterests")

  return {
    privacyStatement: pickBestLocale(rows, "privacyStatement", primaryLocale),
    copyrightStatement: pickBestLocale(rows, "copyrightStatement", primaryLocale),
    authorSelfArchivePolicy: pickBestLocale(rows, "authorSelfArchivePolicy", primaryLocale),
    reviewPolicy: pickBestLocale(rows, "reviewPolicy", primaryLocale),
    openAccessPolicy: pickBestLocale(rows, "openAccessPolicy", primaryLocale),
    doiEnabled: doiRaw === "1" || doiRaw === "true",
    orcidEnabled: orcidRow?.setting_value === "1" || false,
  }
}
