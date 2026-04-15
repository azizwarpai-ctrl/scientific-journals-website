/**
 * Journal Policies Service
 *
 * Fetches dynamic policy tabs from the OJS "Journal Policies" navigation menu.
 * Previously this fetched hard-coded static keys, but OJS manages policy pages
 * dynamically via navigation_menus, navigation_menu_items, and their settings.
 */

import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

export interface PolicyTab {
  title: string
  slug: string
  content: string
}

export interface JournalPolicies {
  tabs: PolicyTab[]
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

interface MenuRow {
  navigation_menu_item_id: number
  slug: string
  seq: number
  setting_name: string
  setting_value: string | null
  locale: string
}

const POLICY_SETTING_NAMES = [
  "enableDois",
  "requireAuthorCompetingInterests",
]

/**
 * Returns the best locale value for a given setting name from a list of rows.
 * Priority: primaryLocale > '' (unlocalized) > any available locale
 */
function pickBestLocale(rows: { setting_name: string; setting_value: string | null; locale: string }[], settingName: string, primaryLocale: string): string | null {
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
    tabs: [],
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

  let configRows: PolicyRow[] = []
  let menuRows: MenuRow[] = []

  try {
    // 1. Fetch system-wide toggles (DOI/Competing Interests)
    const placeholders = POLICY_SETTING_NAMES.map(() => "?").join(", ")
    configRows = await ojsQuery<PolicyRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name IN (${placeholders})
         AND (locale = ? OR locale = '')`,
      [journalId, ...POLICY_SETTING_NAMES, primaryLocale]
    )

    // 2. Fetch dynamic tabs from 'Journal Policies' menu
    menuRows = await ojsQuery<MenuRow>(
      `SELECT 
          nmi.navigation_menu_item_id, 
          nmi.path as slug, 
          nmia.seq, 
          nmis.setting_name, 
          nmis.setting_value, 
          nmis.locale
       FROM navigation_menus nm
       JOIN navigation_menu_item_assignments nmia ON nm.navigation_menu_id = nmia.navigation_menu_id
       JOIN navigation_menu_items nmi ON nmia.navigation_menu_item_id = nmi.navigation_menu_item_id
       LEFT JOIN navigation_menu_item_settings nmis ON nmi.navigation_menu_item_id = nmis.navigation_menu_item_id
       WHERE nm.title = 'Journal Policies' AND nm.context_id = ?
       ORDER BY nmia.seq ASC`,
      [journalId]
    )
  } catch (err) {
    console.error(`[JournalPolicies] Failed to fetch policies for journal_id=${journalId}:`, err)
    throw err
  }

  const POLICY_SANITIZE_OPTIONS = {
    allowedTags: [
      "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", 
      "h1", "h2", "h3", "h4", "h5", "blockquote", "span", "div", 
      "table", "tbody", "tr", "td", "th", "thead", "img"
    ],
    allowedAttributes: { 
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["class", "style"] 
    },
  }

  const sanitizePolicy = (raw: string | null): string => {
    if (!raw) return ""
    return sanitizeHtml(raw, POLICY_SANITIZE_OPTIONS)
  }

  const doiRaw = pickBestLocale(configRows, "enableDois", primaryLocale)
  const competingInterestsRaw = pickBestLocale(configRows, "requireAuthorCompetingInterests", primaryLocale)

  // Group the flat EAV menu rows into structured items
  const itemsMap = new Map<number, { slug: string; seq: number; settings: { setting_name: string; setting_value: string | null; locale: string }[] }>()

  for (const row of menuRows) {
    if (!itemsMap.has(row.navigation_menu_item_id)) {
      itemsMap.set(row.navigation_menu_item_id, { slug: row.slug, seq: row.seq, settings: [] })
    }
    if (row.setting_name) {
      itemsMap.get(row.navigation_menu_item_id)!.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }

  const tabs: PolicyTab[] = []
  
  const sortedItems = Array.from(itemsMap.values()).sort((a, b) => a.seq - b.seq)

  for (const item of sortedItems) {
    const title = pickBestLocale(item.settings, "title", primaryLocale) || "Policy"
    const rawContent = pickBestLocale(item.settings, "content", primaryLocale)
    const content = sanitizePolicy(rawContent)

    // Strict constraint: hide tab if empty or broken
    if (!content.trim() && !rawContent?.trim()) continue

    tabs.push({
      title,
      slug: item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      content,
    })
  }

  return {
    tabs,
    doiEnabled: doiRaw === "1" || doiRaw === "true",
    requireAuthorCompetingInterestsEnabled: competingInterestsRaw === "1" || competingInterestsRaw === "true",
  }
}

