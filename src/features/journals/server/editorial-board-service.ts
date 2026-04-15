/**
 * editorial-board-service.ts
 *
 * Provides a robust API for retrieving OJS editorial board members.
 *
 * Source priority:
 *   1. navigation_menu_items (path='editorial-board') — fetchEditorialBoardFromNavPage()
 *      Journals on this platform store their boards as hand-authored HTML in a
 *      custom OJS page.  This is the authoritative source when content exists.
 *   2. user_user_groups + user_settings — fetchFromUserGroups()
 *      Built-in OJS editorial team system.  Used as fallback when the nav page
 *      is absent or has no content (content_length = 0).
 *
 * The public export `fetchEditorialBoard` transparently orchestrates both sources.
 */

import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { fetchEditorialBoardFromNavPage } from "./editorial-board-nav-service"

// Roles to exclude from the editorial board:
//   16=Journal Manager (admin staff, not academic editors), 65536=Author, 4096=Reviewer, 1048576=Reader
const EXCLUDED_ROLE_IDS = "16, 65536, 4096, 1048576"

interface EditorialBoardRow {
  user_id: number
  role_id: number
  given_name: string | null
  family_name: string | null
  affiliation: string | null
  role_name: string | null
  orcid: string | null
  url: string | null
  profile_image: string | null
  google_scholar: string | null
  scopus_id: string | null
  biography: string | null
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
      ) AS role_name,
      NULLIF(TRIM(us_orcid.setting_value), '')        AS orcid,
      NULLIF(TRIM(us_url.setting_value), '')           AS url,
      NULLIF(TRIM(us_img.setting_value), '')           AS profile_image,
      NULLIF(TRIM(us_scholar.setting_value), '')       AS google_scholar,
      COALESCE(
        NULLIF(TRIM(us_scopus.setting_value), ''),
        NULLIF(TRIM(us_scopus2.setting_value), '')
      )                                                AS scopus_id,
      COALESCE(
        NULLIF(TRIM(us_bio_loc.setting_value), ''),
        NULLIF(TRIM(us_bio_any.setting_value), '')
      )                                                AS biography
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
    -- ORCID iD (locale-independent in OJS user_settings)
    LEFT JOIN user_settings us_orcid
      ON us_orcid.user_id = u.user_id AND us_orcid.setting_name = 'orcid'
    -- Personal / institutional URL
    LEFT JOIN user_settings us_url
      ON us_url.user_id = u.user_id AND us_url.setting_name = 'url'
    -- Profile image (JSON or plain filename stored in OJS public/site/profileImages/)
    LEFT JOIN user_settings us_img
      ON us_img.user_id = u.user_id AND us_img.setting_name = 'profileImage'
    -- Google Scholar profile
    LEFT JOIN user_settings us_scholar
      ON us_scholar.user_id = u.user_id AND us_scholar.setting_name = 'googleScholar'
    -- Scopus author ID (primary key: scopusId, fallback: scopus)
    LEFT JOIN user_settings us_scopus
      ON us_scopus.user_id = u.user_id AND us_scopus.setting_name = 'scopusId'
    LEFT JOIN user_settings us_scopus2
      ON us_scopus2.user_id = u.user_id AND us_scopus2.setting_name = 'scopus'
    -- Biography HTML — localized, used as fallback for link extraction
    LEFT JOIN user_settings us_bio_loc
      ON us_bio_loc.user_id = u.user_id AND us_bio_loc.setting_name = 'biography' AND us_bio_loc.locale = ?
    LEFT JOIN (
      SELECT us1.user_id, us1.setting_value
      FROM user_settings us1
      INNER JOIN (
        SELECT user_id, MIN(locale) AS min_loc
        FROM user_settings
        WHERE setting_name = 'biography' AND TRIM(setting_value) != '' AND TRIM(locale) != ''
        GROUP BY user_id
      ) us2 ON us1.user_id = us2.user_id AND us1.locale = us2.min_loc
      WHERE us1.setting_name = 'biography'
    ) us_bio_any ON us_bio_any.user_id = u.user_id
    ${whereClause}
    ORDER BY ug.role_id ASC, family_name ASC, given_name ASC`
}

/**
 * Resolve the OJS profileImage setting value to a public URL.
 *
 * OJS stores profile images in two formats:
 *   - JSON: {"dateUploaded":"...","uploadName":"filename.jpg"}
 *   - Plain string: "filename.jpg"
 *
 * The image is served at: {OJS_BASE_URL}/public/site/profileImages/{filename}
 */
function resolveProfileImageUrl(rawValue: string | null): string | null {
  if (!rawValue) return null
  const trimmed = rawValue.trim()
  if (!trimmed) return null

  const ojsBaseUrl = process.env.OJS_BASE_URL?.replace(/\/$/, "")
  if (!ojsBaseUrl) return null

  // JSON format: {"uploadName":"..."}
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      const filename = parsed.uploadName ?? parsed.fileName ?? parsed.name
      if (typeof filename === "string" && filename.trim()) {
        return `${ojsBaseUrl}/public/site/profileImages/${filename.trim()}`
      }
    } catch {
      // fall through
    }
  }

  // Already a full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  // Plain filename
  return `${ojsBaseUrl}/public/site/profileImages/${trimmed}`
}

/**
 * Build a canonical Google Scholar URL from a raw setting value.
 * The value may be:
 *   - Full URL: "https://scholar.google.com/citations?user=XXXXX"
 *   - Just the user ID: "XXXXX"
 */
function resolveScholarUrl(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  // Treat as bare user ID
  return `https://scholar.google.com/citations?user=${encodeURIComponent(trimmed)}`
}

/**
 * Build a canonical Scopus author URL from a raw setting value.
 * The value may be:
 *   - Full URL: "https://www.scopus.com/authid/detail.uri?authorId=XXXXXX"
 *   - Just the numeric author ID: "123456789"
 */
function resolveScopusUrl(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  if (/^\d+$/.test(trimmed)) {
    return `https://www.scopus.com/authid/detail.uri?authorId=${trimmed}`
  }
  return null
}

/**
 * Parse biography HTML to extract ORCID, Google Scholar, and Scopus links
 * as a fallback when user_settings keys are absent.
 */
function extractLinksFromBiography(bio: string | null): {
  orcid: string | null
  googleScholar: string | null
  scopus: string | null
} {
  if (!bio) return { orcid: null, googleScholar: null, scopus: null }

  const orcidMatch = bio.match(/https?:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i)
  const scholarMatch = bio.match(/https?:\/\/scholar\.google\.[a-z.]+\/citations\?[^\s"'<>]+/i)
  const scopusMatch = bio.match(/https?:\/\/(?:www\.)?scopus\.com\/authid\/detail\.uri\?[^\s"'<>]+/i)

  return {
    orcid: orcidMatch ? orcidMatch[1] : null,
    googleScholar: scholarMatch ? scholarMatch[0] : null,
    scopus: scopusMatch ? scopusMatch[0] : null,
  }
}

/** Strip ORCID to bare 16-char ID (XXXX-XXXX-XXXX-XXXX) */
function normaliseOrcid(raw: string | null): string | null {
  if (!raw) return null
  const match = raw.trim().match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i)
  return match ? match[1] : null
}

/**
 * In-memory cache for editorial boards to prevent expensive LIKE queries on every request.
 * Cache invalidates after 15 minutes (or on process restart).
 */
const boardCache = new Map<string, { data: EditorialBoardMember[]; timestamp: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000

/**
 * Public entry point.  Tries the nav page first; falls back to user_groups.
 *
 * Nav page returns null  → journal has no editorial-board custom page content
 *                          (or the DB query failed) → use user_groups fallback.
 * Nav page returns []    → page exists but parsed 0 members (possibly malformed
 *                          HTML) → still prefer nav page result (empty array)
 *                          so we don't accidentally show stale user_groups data.
 */
export async function fetchEditorialBoard(
  ojsJournalId: string
): Promise<EditorialBoardMember[]> {
  // ── Step 0: Resolve primary locale (shared between both sources) ──
  let primaryLocale = "en"
  if (/^\d+$/.test(ojsJournalId)) {
    try {
      const rows = await ojsQuery<{ primary_locale: string }>(
        "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
        [parseInt(ojsJournalId, 10)]
      )
      if (rows[0]?.primary_locale) primaryLocale = rows[0].primary_locale
    } catch { /* non-fatal */ }
  }

  // ── Step 1: Nav page (primary source) ──
  const navMembers = await fetchEditorialBoardFromNavPage(ojsJournalId, primaryLocale)
  if (navMembers !== null) {
    return navMembers // authoritative — even if empty
  }

  // ── Step 2: user_groups fallback ──
  return fetchFromUserGroups(ojsJournalId, primaryLocale)
}

/**
 * Fallback: fetch editorial board members from OJS user_user_groups tables.
 *
 * SQL path:
 *   users → user_user_groups → user_groups → user_settings → user_group_settings
 *
 * Inclusion logic:
 *   - masthead = 1  (OJS public-display flag), OR
 *   - Editor role IDs (17, 18, 19, 68, 69), OR
 *   - Group name contains "editor", "board", "محرر", "لجنة"
 *
 * Exclusion: Journal Manager (16), Author (65536), Reviewer (4096), Reader (1048576)
 */
async function fetchFromUserGroups(
  ojsJournalId: string,
  primaryLocale: string
): Promise<EditorialBoardMember[]> {
  const now = Date.now()
  const cached = boardCache.get(ojsJournalId)
  if (cached) {
    if (now - cached.timestamp < CACHE_TTL_MS) return cached.data
    boardCache.delete(ojsJournalId)
  }

  if (!/^\d+$/.test(ojsJournalId)) {
    console.error(`[EditorialBoard] Invalid journal ID format: ${ojsJournalId}`)
    return []
  }

  const journalId = parseInt(ojsJournalId, 10)

  // ── Step 1: Broad role query ──
  const broadWhere = `WHERE (
      uug.masthead = 1
      OR (uug.masthead IS NULL AND ug.masthead = 1)
      OR ug.role_id IN (17, 18, 19, 68, 69)
      OR LOWER(ugs_name_loc.setting_value) LIKE '%editor%'
      OR LOWER(ugs_name_any.setting_value) LIKE '%editor%'
      OR LOWER(ugs_name_loc.setting_value) LIKE '%board%'
      OR LOWER(ugs_name_any.setting_value) LIKE '%board%'
      OR LOWER(ugs_name_loc.setting_value) LIKE '%محرر%'
      OR LOWER(ugs_name_any.setting_value) LIKE '%محرر%'
      OR LOWER(ugs_name_loc.setting_value) LIKE '%لجنة%'
      OR LOWER(ugs_name_any.setting_value) LIKE '%لجنة%'
    ) AND ug.role_id NOT IN (${EXCLUDED_ROLE_IDS})`

  // Parameters match ? placeholders in buildEditorialBoardQuery order:
  // 1=journalId (ug.context_id), 2=locale (given), 3=locale (family),
  // 4=locale (affiliation), 5=locale (role name), 6=journalId (role subquery),
  // 7=locale (biography)
  const parameters = [
    journalId,
    primaryLocale,
    primaryLocale,
    primaryLocale,
    primaryLocale,
    journalId,
    primaryLocale,
  ]

  let effectiveRows: EditorialBoardRow[] = []
  try {
    effectiveRows = await ojsQuery<EditorialBoardRow>(
      buildEditorialBoardQuery(broadWhere),
      parameters
    )
    console.log(`[EditorialBoard] journal_id=${journalId}: retrieved ${effectiveRows.length} broad board rows.`)
  } catch (dbError) {
    console.error(`[EditorialBoard] journal_id=${journalId}: OJS query failed:`, dbError)
    return []
  }

  // ── Step 2: Map + deduplicate by user_id ──
  const seenUsers = new Set<number>()
  const members: EditorialBoardMember[] = []

  for (const row of effectiveRows) {
    if (seenUsers.has(row.user_id)) continue
    seenUsers.add(row.user_id)

    const givenName = row.given_name?.trim() ?? ""
    const familyName = row.family_name?.trim() ?? ""
    const fullName = [givenName, familyName].filter(Boolean).join(" ")
    if (!fullName) continue

    // Resolve profile image URL from OJS public directory
    const profileImage = resolveProfileImageUrl(row.profile_image)

    // ORCID: normalise to bare 16-char ID, with biography HTML fallback
    const bioLinks = extractLinksFromBiography(row.biography)
    const rawOrcid = row.orcid?.trim() || null
    const orcid = normaliseOrcid(rawOrcid) ?? bioLinks.orcid

    // Google Scholar: setting value → canonical URL, biography fallback
    const googleScholar =
      resolveScholarUrl(row.google_scholar) ?? bioLinks.googleScholar

    // Scopus: setting value (ID or URL) → canonical URL, biography fallback
    const scopus =
      resolveScopusUrl(row.scopus_id) ?? bioLinks.scopus

    members.push({
      userId: row.user_id,
      name: fullName,
      role: row.role_name?.trim() || "Editorial Board Member",
      affiliation: row.affiliation?.trim() || null,
      roleId: row.role_id,
      orcid,
      url: row.url?.trim() || null,
      profileImage,
      googleScholar,
      scopus,
    })
  }

  // ── Step 3: Sort by editorial seniority ──
  members.sort((a, b) => {
    const getRank = (roleId?: number, roleName = "") => {
      const n = roleName.toLowerCase()
      if (roleId === 16 || n.includes("chief") || n.includes("principal")) return 1
      if (roleId === 19 || n.includes("section")) return 2
      if (roleId === 17 || n.includes("editor")) return 3
      return 4
    }
    const diff = getRank(a.roleId, a.role) - getRank(b.roleId, b.role)
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })

  console.log(`[EditorialBoard] journal_id=${journalId}: returning ${members.length} unique board members`)
  boardCache.set(ojsJournalId, { data: members, timestamp: Date.now() })
  return members
}
