/**
 * Editorial Board Service
 *
 * Fetches the journal's editorial board members directly from the OJS MySQL
 * database using the established ojsQuery() pattern.
 *
 * OJS 3.4+ Schema References (from dbkgvcunttgs97.sql):
 * - user_groups: user_group_id, context_id (=journal_id), role_id, masthead (group default)
 * - user_group_settings: EAV — setting_name='name' gives role title per locale
 * - user_user_groups: user_group_id, user_id, masthead (per-user override, DEFAULT NULL)
 * - users: user_id (FK)
 * - user_settings: EAV — givenName, familyName, affiliation per locale
 *
 * Masthead display logic (OJS 3.4+):
 *   uug.masthead = 1 → show (explicit user opt-in)
 *   uug.masthead IS NULL → fall back to ug.masthead (group-level default)
 *   uug.masthead = 0 → hide (explicit user opt-out)
 *
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
 * Members are visible if:
 * - user_user_groups.masthead = 1 (explicit per-user opt-in), OR
 * - user_user_groups.masthead IS NULL AND user_groups.masthead = 1 (group-level default)
 *
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
  // OJS 3.4+ masthead logic:
  //   uug.masthead = 1 → show (explicit per-user)
  //   uug.masthead IS NULL + ug.masthead = 1 → show (group default)
  //   uug.masthead = 0 → hide (explicit per-user)
  //
  // Locale fallback strategy for user_settings:
  //   Try primary locale first, then fall back to ANY available locale
  //   (OJS 3.4+ rarely stores empty-locale rows — most data uses the real locale)
  const rows = await ojsQuery<EditorialBoardRow>(
    `SELECT
      u.user_id,
      ug.role_id,
      COALESCE(
        NULLIF(TRIM(us_given_loc.setting_value), ''),
        NULLIF(TRIM(us_given_any.setting_value), '')
      ) AS given_name,
      COALESCE(
        NULLIF(TRIM(us_family_loc.setting_value), ''),
        NULLIF(TRIM(us_family_any.setting_value), '')
      ) AS family_name,
      COALESCE(
        NULLIF(TRIM(us_affil_loc.setting_value), ''),
        NULLIF(TRIM(us_affil_any.setting_value), '')
      ) AS affiliation,
      COALESCE(
        NULLIF(TRIM(ugs_name_loc.setting_value), ''),
        NULLIF(TRIM(ugs_name_any.setting_value), '')
      ) AS role_name
    FROM user_user_groups uug
    INNER JOIN user_groups ug
      ON ug.user_group_id = uug.user_group_id
      AND ug.context_id = ?
    INNER JOIN users u
      ON u.user_id = uug.user_id
      AND u.disabled = 0
    -- Given name: primary locale
    LEFT JOIN user_settings us_given_loc
      ON us_given_loc.user_id = u.user_id
      AND us_given_loc.setting_name = 'givenName'
      AND us_given_loc.locale = ?
    -- Given name: any available locale fallback (pick one with MIN)
    LEFT JOIN (
      SELECT user_id, MIN(setting_value) AS setting_value
      FROM user_settings
      WHERE setting_name = 'givenName' AND TRIM(setting_value) != ''
      GROUP BY user_id
    ) us_given_any ON us_given_any.user_id = u.user_id
    -- Family name: primary locale
    LEFT JOIN user_settings us_family_loc
      ON us_family_loc.user_id = u.user_id
      AND us_family_loc.setting_name = 'familyName'
      AND us_family_loc.locale = ?
    -- Family name: any available locale fallback
    LEFT JOIN (
      SELECT user_id, MIN(setting_value) AS setting_value
      FROM user_settings
      WHERE setting_name = 'familyName' AND TRIM(setting_value) != ''
      GROUP BY user_id
    ) us_family_any ON us_family_any.user_id = u.user_id
    -- Affiliation: primary locale
    LEFT JOIN user_settings us_affil_loc
      ON us_affil_loc.user_id = u.user_id
      AND us_affil_loc.setting_name = 'affiliation'
      AND us_affil_loc.locale = ?
    -- Affiliation: any available locale fallback
    LEFT JOIN (
      SELECT user_id, MIN(setting_value) AS setting_value
      FROM user_settings
      WHERE setting_name = 'affiliation' AND TRIM(setting_value) != ''
      GROUP BY user_id
    ) us_affil_any ON us_affil_any.user_id = u.user_id
    -- Role name: primary locale
    LEFT JOIN user_group_settings ugs_name_loc
      ON ugs_name_loc.user_group_id = ug.user_group_id
      AND ugs_name_loc.setting_name = 'name'
      AND ugs_name_loc.locale = ?
    -- Role name: any available locale fallback
    LEFT JOIN (
      SELECT user_group_id, MIN(setting_value) AS setting_value
      FROM user_group_settings
      WHERE setting_name = 'name' AND TRIM(setting_value) != ''
      GROUP BY user_group_id
    ) ugs_name_any ON ugs_name_any.user_group_id = ug.user_group_id
    WHERE (
      uug.masthead = 1
      OR (uug.masthead IS NULL AND ug.masthead = 1)
    )
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
