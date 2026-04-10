/**
 * Editorial Board Service
 *
 * Fetches the journal's editorial board members directly from the OJS MySQL
 * database using the established ojsQuery() pattern.
 *
 * OJS Schema References (from dbkgvcunttgs97.sql):
 * - user_groups: user_group_id, context_id (=journal_id), role_id, masthead
 * - user_group_settings: EAV — setting_name='name' gives role title per locale
 * - user_user_groups: user_group_id, user_id, masthead (1 = show on public masthead)
 * - users: user_id (FK)
 * - user_settings: EAV — givenName, familyName, affiliation per locale
 *
 * Only users with user_user_groups.masthead = 1 appear here.
 * Role IDs excluded from board display: 65536 (Author), 4096 (Reviewer), 1048576 (Reader)
 */

import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

// Roles that should NOT appear on editorial boards
const EXCLUDED_ROLE_IDS = new Set([65536, 4096, 1048576])

interface EditorialBoardRow {
  user_id: number
  role_id: number
  given_name: string | null
  family_name: string | null
  affiliation: string | null
  role_name: string | null
}

/**
 * Fetch editorial board members for the given OJS journal.
 *
 * Only users flagged with masthead=1 in user_user_groups are returned.
 * Results are ordered by role_id ASC (editors first), then by family name.
 *
 * @param ojsJournalId - The OJS journal_id (numeric string)
 * @returns Array of EditorialBoardMember, empty if no masthead members found
 */
export async function fetchEditorialBoard(
  ojsJournalId: string
): Promise<EditorialBoardMember[]> {
  if (!/^\d+$/.test(ojsJournalId)) {
    console.error("[EditorialBoard] Invalid OJS journal ID:", ojsJournalId)
    return []
  }

  const journalId = parseInt(ojsJournalId, 10)

  // ── Step 0: Get journal primary locale ──
  const localeRows = await ojsQuery<{ primary_locale: string }>(
    "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
    [journalId]
  )

  if (localeRows.length === 0) {
    console.error(`[EditorialBoard] Journal not found: journal_id=${journalId}`)
    return []
  }

  const primaryLocale = localeRows[0].primary_locale

  // ── Step 1: Fetch masthead members ──
  // Filter: user_user_groups.masthead = 1 (public display)
  // Exclude: non-editorial role IDs
  const rows = await ojsQuery<EditorialBoardRow>(
    `SELECT
      u.user_id,
      ug.role_id,
      COALESCE(NULLIF(TRIM(us_given_loc.setting_value), ''), NULLIF(TRIM(us_given_def.setting_value), ''))  AS given_name,
      COALESCE(NULLIF(TRIM(us_family_loc.setting_value), ''), NULLIF(TRIM(us_family_def.setting_value), '')) AS family_name,
      COALESCE(NULLIF(TRIM(us_affil_loc.setting_value), ''), NULLIF(TRIM(us_affil_def.setting_value), ''))  AS affiliation,
      COALESCE(
        NULLIF(TRIM(ugs_name_loc.setting_value), ''),
        NULLIF(TRIM(ugs_name_def.setting_value), '')
      )                       AS role_name
    FROM user_user_groups uug
    INNER JOIN user_groups ug
      ON ug.user_group_id = uug.user_group_id
      AND ug.context_id = ?
    INNER JOIN users u
      ON u.user_id = uug.user_id
      AND u.disabled = 0
    -- Given name
    LEFT JOIN user_settings us_given_loc
      ON us_given_loc.user_id = u.user_id
      AND us_given_loc.setting_name = 'givenName'
      AND us_given_loc.locale = ?
    LEFT JOIN user_settings us_given_def
      ON us_given_def.user_id = u.user_id
      AND us_given_def.setting_name = 'givenName'
      AND us_given_def.locale = ''
    -- Family name
    LEFT JOIN user_settings us_family_loc
      ON us_family_loc.user_id = u.user_id
      AND us_family_loc.setting_name = 'familyName'
      AND us_family_loc.locale = ?
    LEFT JOIN user_settings us_family_def
      ON us_family_def.user_id = u.user_id
      AND us_family_def.setting_name = 'familyName'
      AND us_family_def.locale = ''
    -- Affiliation
    LEFT JOIN user_settings us_affil_loc
      ON us_affil_loc.user_id = u.user_id
      AND us_affil_loc.setting_name = 'affiliation'
      AND us_affil_loc.locale = ?
    LEFT JOIN user_settings us_affil_def
      ON us_affil_def.user_id = u.user_id
      AND us_affil_def.setting_name = 'affiliation'
      AND us_affil_def.locale = ''
    -- Role name: prefer primary locale, fallback to empty locale (default)
    LEFT JOIN user_group_settings ugs_name_loc
      ON ugs_name_loc.user_group_id = ug.user_group_id
      AND ugs_name_loc.setting_name = 'name'
      AND ugs_name_loc.locale = ?
    LEFT JOIN user_group_settings ugs_name_def
      ON ugs_name_def.user_group_id = ug.user_group_id
      AND ugs_name_def.setting_name = 'name'
      AND ugs_name_def.locale = ''
    WHERE uug.masthead = 1
    ORDER BY ug.role_id ASC, family_name ASC, given_name ASC`,
    [journalId, primaryLocale, primaryLocale, primaryLocale, primaryLocale]
  )

  // ── Step 2: Map and deduplicate by user_id ──
  const seenUsers = new Set<number>()
  const members: EditorialBoardMember[] = []

  for (const row of rows) {
    // Skip excluded role types
    if (EXCLUDED_ROLE_IDS.has(row.role_id)) continue
    // Deduplicate (a user may appear in multiple groups, keep lowest role_id = first)
    if (seenUsers.has(row.user_id)) continue
    seenUsers.add(row.user_id)

    const givenName = row.given_name?.trim() ?? ""
    const familyName = row.family_name?.trim() ?? ""
    const fullName = [givenName, familyName].filter(Boolean).join(" ")

    if (!fullName) continue // Skip users with no displayable name

    members.push({
      userId: row.user_id,
      name: fullName,
      role: row.role_name?.trim() || "Editorial Board Member",
      affiliation: row.affiliation?.trim() || null,
      roleId: row.role_id,
    })
  }

  console.log(
    `[EditorialBoard] journal_id=${journalId}: found ${members.length} members`
  )
  return members
}
