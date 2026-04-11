/**
 * editorial-board-service.ts
 *
 * Provides a robust API for retrieving OJS editorial board members
 * mapped to the unified Next.js representation.
 */

import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

// Roles to exclude from the editorial board (Author=65536, Reviewer=4096, Reader=1048576)
const EXCLUDED_ROLE_IDS = "65536, 4096, 1048576"

interface EditorialBoardRow {
  user_id: number
  role_id: number
  given_name: string | null
  family_name: string | null
  affiliation: string | null
  role_name: string | null
}

function buildEditorialBoardQuery(whereClause: string) {
  return `SELECT
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
    -- Given name
    LEFT JOIN user_settings us_given_loc
      ON us_given_loc.user_id = u.user_id AND us_given_loc.setting_name = 'givenName' AND us_given_loc.locale = ?
    LEFT JOIN (
      SELECT us1.user_id, us1.setting_value
      FROM user_settings us1
      INNER JOIN (
        SELECT user_id, MIN(locale) AS min_loc
        FROM user_settings
        WHERE setting_name = 'givenName' AND TRIM(setting_value) != '' AND TRIM(locale) != ''
        GROUP BY user_id
      ) us2 ON us1.user_id = us2.user_id AND us1.locale = us2.min_loc
      WHERE us1.setting_name = 'givenName'
    ) us_given_any ON us_given_any.user_id = u.user_id
    -- Family name
    LEFT JOIN user_settings us_family_loc
      ON us_family_loc.user_id = u.user_id AND us_family_loc.setting_name = 'familyName' AND us_family_loc.locale = ?
    LEFT JOIN (
      SELECT us1.user_id, us1.setting_value
      FROM user_settings us1
      INNER JOIN (
        SELECT user_id, MIN(locale) AS min_loc
        FROM user_settings
        WHERE setting_name = 'familyName' AND TRIM(setting_value) != '' AND TRIM(locale) != ''
        GROUP BY user_id
      ) us2 ON us1.user_id = us2.user_id AND us1.locale = us2.min_loc
      WHERE us1.setting_name = 'familyName'
    ) us_family_any ON us_family_any.user_id = u.user_id
    -- Affiliation
    LEFT JOIN user_settings us_affil_loc
      ON us_affil_loc.user_id = u.user_id AND us_affil_loc.setting_name = 'affiliation' AND us_affil_loc.locale = ?
    LEFT JOIN (
      SELECT us1.user_id, us1.setting_value
      FROM user_settings us1
      INNER JOIN (
        SELECT user_id, MIN(locale) AS min_loc
        FROM user_settings
        WHERE setting_name = 'affiliation' AND TRIM(setting_value) != '' AND TRIM(locale) != ''
        GROUP BY user_id
      ) us2 ON us1.user_id = us2.user_id AND us1.locale = us2.min_loc
      WHERE us1.setting_name = 'affiliation'
    ) us_affil_any ON us_affil_any.user_id = u.user_id
    -- Role name
    LEFT JOIN user_group_settings ugs_name_loc
      ON ugs_name_loc.user_group_id = ug.user_group_id AND ugs_name_loc.setting_name = 'name' AND ugs_name_loc.locale = ?
    LEFT JOIN (
      SELECT gs1.user_group_id, gs1.setting_value
      FROM user_group_settings gs1
      INNER JOIN (
        SELECT gs2.user_group_id, MIN(gs2.locale) AS min_loc
        FROM user_group_settings gs2
        INNER JOIN user_groups g2 ON g2.user_group_id = gs2.user_group_id
        WHERE gs2.setting_name = 'name' AND TRIM(gs2.setting_value) != '' AND TRIM(gs2.locale) != '' AND g2.context_id = ?
        GROUP BY gs2.user_group_id
      ) gq ON gs1.user_group_id = gq.user_group_id AND gs1.locale = gq.min_loc
      WHERE gs1.setting_name = 'name'
    ) ugs_name_any ON ugs_name_any.user_group_id = ug.user_group_id
    ${whereClause}
    ORDER BY ug.role_id ASC, family_name ASC, given_name ASC`
}

/**
 * Fetch editorial board members for the given OJS journal.
 *
 * Rebuilt Logic:
 * - DO NOT rely exclusively on masthead=1 (which is often misconfigured).
 * - Match on Editor roles (16 = Manager, 17 = Editor, 18 = Guest, 19 = Section)
 * - Match on group names containing 'Editor' or 'Board'.
 * - Exclude standard non-board roles like Author (65536), Reviewer (4096), Reader (1048576).
 *
 * @param ojsJournalId - The OJS journal_id (numeric string)
 * @returns Array of EditorialBoardMember, empty if no members found or DB failure
 */
export async function fetchEditorialBoard(
  ojsJournalId: string
): Promise<EditorialBoardMember[]> {
  if (!/^\d+$/.test(ojsJournalId)) {
    console.error(`[EditorialBoard] Invalid journal ID format: ${ojsJournalId}`)
    return []
  }

  const journalId = parseInt(ojsJournalId, 10)

  // ── Step 0: Get journal primary locale ──
  let primaryLocale = "en_US";
  try {
    const localeRows = await ojsQuery<{ primary_locale: string }>(
      "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
      [journalId]
    )
    if (localeRows.length > 0 && localeRows[0].primary_locale) {
      primaryLocale = localeRows[0].primary_locale;
    }
  } catch (err) {
    console.warn(`[EditorialBoard] Failed to fetch primary_locale, defaulting to en_US. Error:`, err);
  }

  // ── Step 1: Execute Broad Role Query ──
  // Include masthead=1 OR Editor Roles (16, 17, 18, 19) OR name matches
  // Exclude Authors, Reviewers, Readers.
  const broadWhere = `WHERE (
      uug.masthead = 1
      OR (uug.masthead IS NULL AND ug.masthead = 1)
      OR ug.role_id IN (16, 17, 18, 19)
      OR LOWER(ugs_name_loc.setting_value) LIKE '%editor%'
      OR LOWER(ugs_name_any.setting_value) LIKE '%editor%'
      OR LOWER(ugs_name_loc.setting_value) LIKE '%board%'
      OR LOWER(ugs_name_any.setting_value) LIKE '%board%'
    ) AND ug.role_id NOT IN (${EXCLUDED_ROLE_IDS})`

  const parameters = [journalId, primaryLocale, primaryLocale, primaryLocale, primaryLocale, journalId]

  let effectiveRows: EditorialBoardRow[] = []
  try {
    effectiveRows = await ojsQuery<EditorialBoardRow>(
      buildEditorialBoardQuery(broadWhere),
      parameters
    )
    console.log(`[EditorialBoard] journal_id=${journalId}: Query retrieved ${effectiveRows.length} broad board rows.`)
  } catch (dbError) {
    console.error(`[EditorialBoard] journal_id=${journalId}: OJS query completely failed:`, dbError)
    // Fallback: Rather than 502, we return an empty array cleanly.
    return []
  }

  // ── Step 2: Map and deduplicate by user_id ──
  const seenUsers = new Set<number>()
  const members: EditorialBoardMember[] = []

  for (const row of effectiveRows) {
    // Deduplicate (a user may appear in multiple groups, keep lowest role_id = highest rank)
    // Managers/Editors (16,17) take precedence over Section Editors (19)
    if (seenUsers.has(row.user_id)) continue
    seenUsers.add(row.user_id)

    const givenName = row.given_name?.trim() ?? ""
    const familyName = row.family_name?.trim() ?? ""
    const fullName = [givenName, familyName].filter(Boolean).join(" ")

    if (!fullName) continue

    members.push({
      userId: row.user_id,
      name: fullName,
      role: row.role_name?.trim() || "Editorial Board Member",
      affiliation: row.affiliation?.trim() || null,
      roleId: row.role_id,
    })
  }

  // ── Step 3: Enforce Order (Editor-in-Chief -> Editors -> Board Members) ──
  // This helps visually structure the grouped roles in UI
  members.sort((a, b) => {
    // Rank logic based on OJS roles: Manager(16), Editor(17), Guest(18), Section(19), Board(others)
    const getRank = (roleId?: number, roleName: string = "") => {
      const lowerName = roleName.toLowerCase();
      if (roleId === 16 || lowerName.includes("chief") || lowerName.includes("principal")) return 1;
      if (roleId === 17 || lowerName === "editor") return 2;
      if (roleId === 19 || lowerName.includes("section")) return 3;
      return 4;
    };
    
    const rankA = getRank(a.roleId, a.role);
    const rankB = getRank(b.roleId, b.role);
    
    // Primary sort by rank, secondary by alphabet
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });

  console.log(`[EditorialBoard] journal_id=${journalId}: returning ${members.length} unique board members`)
  return members
}
