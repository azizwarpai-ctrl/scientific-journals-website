/**
 * Editorial Board Types
 *
 * Represents members of the journal's editorial board as returned from
 * OJS user_groups + user_user_groups + users + user_settings tables.
 *
 * Only users with masthead=1 in user_user_groups appear here — this
 * is the OJS flag that controls public display on the journal masthead.
 */

export interface EditorialBoardMember {
  /** OJS user_id */
  userId: number
  /** Full name (givenName + familyName from user_settings) */
  name: string
  /** Role title from user_group_settings (e.g. "Editor-in-Chief", "Section Editor") */
  role: string
  /** Affiliation from user_settings, if present */
  affiliation: string | null
  /** OJS role_id — numeric identifier for the role type */
  roleId: number
  /** ORCID iD — bare 16-char ID (XXXX-XXXX-XXXX-XXXX) or null */
  orcid?: string | null
  /** Personal or institutional website URL from user_settings */
  url?: string | null
  /** Profile image URL (resolved from OJS public/site/profileImages/) */
  profileImage?: string | null
  /** Google Scholar profile URL */
  googleScholar?: string | null
  /** Scopus author profile URL */
  scopus?: string | null
}

export interface EditorialBoardResponse {
  members: EditorialBoardMember[]
}
