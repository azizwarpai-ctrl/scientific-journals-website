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

import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

export interface JournalPolicies {
  privacyStatement: string | null
  copyrightStatement: string | null
  authorSelfArchivePolicy: string | null
  reviewPolicy: string | null
  openAccessPolicy: string | null
  /** Whether DOI registration is enabled for this journal (boolean stored as '0'/'1') */
  doiEnabled: boolean
  /** Whether authors are required to declare competing interests */
  requireAuthorCompetingInterestsEnabled: boolean
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

  // Use existence checks (not truthiness) so an intentionally empty string is preserved.
  const localeMatch = matching.find((r) => r.locale === primaryLocale)
  if (localeMatch !== undefined) return localeMatch.setting_value

  const unlocalized = matching.find((r) => r.locale === "")
  if (unlocalized !== undefined) return unlocalized.setting_value

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
    requireAuthorCompetingInterestsEnabled: false,
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
    throw err
  }

  const POLICY_SANITIZE_OPTIONS = {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", "h3", "h4", "h5", "blockquote", "span"],
    allowedAttributes: { a: ["href", "target", "rel"] },
  }

  const sanitizePolicy = (raw: string | null): string | null => {
    if (!raw) return null
    return sanitizeHtml(raw, POLICY_SANITIZE_OPTIONS)
  }

  const doiRaw = pickBestLocale(rows, "enableDois", primaryLocale)
  const competingInterestsRaw = pickBestLocale(rows, "requireAuthorCompetingInterests", primaryLocale)

  return {
    privacyStatement: sanitizePolicy(pickBestLocale(rows, "privacyStatement", primaryLocale)),
    copyrightStatement: sanitizePolicy(pickBestLocale(rows, "copyrightStatement", primaryLocale)),
    authorSelfArchivePolicy: sanitizePolicy(pickBestLocale(rows, "authorSelfArchivePolicy", primaryLocale)),
    reviewPolicy: sanitizePolicy(pickBestLocale(rows, "reviewPolicy", primaryLocale)),
    openAccessPolicy: sanitizePolicy(pickBestLocale(rows, "openAccessPolicy", primaryLocale)),
    doiEnabled: doiRaw === "1" || doiRaw === "true",
    requireAuthorCompetingInterestsEnabled: competingInterestsRaw === "1" || competingInterestsRaw === "true",
  }
}
