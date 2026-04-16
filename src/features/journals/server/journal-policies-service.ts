/**
 * Journal Policies Service
 *
 * Fetches dynamic policy tabs from multiple OJS sources:
 *
 * 1. Navigation menu system — "Journal Policies" custom menu with ordered items
 * 2. journal_settings — standard policy fields (privacyStatement, copyrightNotice, …)
 * 3. static_pages — plugin-managed custom content pages
 *
 * Built-in OJS menu item types (e.g. NMI_TYPE_PRIVACY) store their content in
 * journal_settings, NOT in navigation_menu_item_settings.  The service resolves
 * content from the correct source based on each item's `type` column.
 *
 * When no "Journal Policies" navigation menu exists, the service falls back to
 * journal_settings + static_pages so policy tabs are always generated dynamically.
 */

import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

// ── Public types ────────────────────────────────────────────────────────────

export interface PolicyTab {
  title: string
  slug: string
  content: string
}

export interface JournalPolicies {
  tabs: PolicyTab[]
  /** Whether DOI registration is enabled for this journal */
  doiEnabled: boolean
  /** Whether authors are required to declare competing interests */
  requireAuthorCompetingInterestsEnabled: boolean
}

// ── Internal row types ──────────────────────────────────────────────────────

interface SettingRow {
  setting_name: string
  setting_value: string | null
  locale: string
}

interface MenuRow {
  navigation_menu_item_id: number
  slug: string
  type: string
  seq: number
  setting_name: string
  setting_value: string | null
  locale: string
}

interface StaticPageRow {
  static_page_id: number
  path: string
  setting_name: string
  setting_value: string | null
  locale: string
}

interface StandaloneNavRow {
  navigation_menu_item_id: number
  path: string
  type: string
  setting_name: string
  setting_value: string | null
  locale: string
}

// ── OJS built-in type → journal_settings mapping ────────────────────────────
//
// OJS built-in navigation menu item types resolve their display content from
// journal_settings rather than navigation_menu_item_settings.
//
// This map intentionally covers only the built-in types that carry policy HTML
// in journal_settings.  It is NOT exhaustive: types such as NMI_TYPE_ABOUT,
// NMI_TYPE_SUBMISSIONS, and NMI_TYPE_EDITORIAL_TEAM point to other parts of
// the OJS UI and have no standalone HTML content to display here.
//
// To add support for a new built-in type, insert an entry keyed by the OJS
// PHP constant name (e.g. "NMI_TYPE_FOO") with the corresponding
// journal_settings key and a default display title.

const BUILTIN_TYPE_TO_SETTING: Record<string, { settingName: string; defaultTitle: string }> = {
  "NMI_TYPE_PRIVACY": { settingName: "privacyStatement", defaultTitle: "Privacy Statement" },
}

// ── Standard policy settings in journal_settings (fallback source) ──────────

const STANDARD_POLICY_SETTINGS = [
  { settingName: "privacyStatement",        defaultTitle: "Privacy Statement",    slug: "privacy" },
  { settingName: "copyrightNotice",         defaultTitle: "Copyright",            slug: "copyright" },
  { settingName: "openAccessPolicy",        defaultTitle: "Open Access Policy",   slug: "open-access" },
  { settingName: "reviewPolicy",            defaultTitle: "Review Policy",        slug: "review-policy" },
  { settingName: "authorSelfArchivePolicy", defaultTitle: "Self-Archiving Policy", slug: "self-archiving" },
] as const

// ── Sanitization config ─────────────────────────────────────────────────────

const POLICY_SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "h5", "blockquote", "span", "div",
    "table", "tbody", "tr", "td", "th", "thead", "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["class", "style"],
  },
}

function sanitizePolicy(raw: string | null): string {
  if (!raw) return ""
  return sanitizeHtml(raw, POLICY_SANITIZE_OPTIONS)
}

// ── Locale resolution ───────────────────────────────────────────────────────

/**
 * Priority: primaryLocale → '' (unlocalized) → any available locale.
 */
function pickBestLocale(
  rows: { setting_name: string; setting_value: string | null; locale: string }[],
  settingName: string,
  primaryLocale: string,
): string | null {
  const matching = rows.filter((r) => r.setting_name === settingName)
  if (matching.length === 0) return null

  const localeMatch = matching.find((r) => r.locale === primaryLocale)
  if (localeMatch !== undefined) return localeMatch.setting_value

  const unlocalized = matching.find((r) => r.locale === "")
  if (unlocalized !== undefined) return unlocalized.setting_value

  return matching[0]?.setting_value ?? null
}

function makeSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function fetchJournalPolicies(ojsJournalId: string): Promise<JournalPolicies> {
  const empty: JournalPolicies = {
    tabs: [],
    doiEnabled: false,
    requireAuthorCompetingInterestsEnabled: false,
  }

  if (!/^\d+$/.test(ojsJournalId)) return empty

  const journalId = parseInt(ojsJournalId, 10)

  // ── Resolve primary locale ──────────────────────────────────────────────
  let primaryLocale = "en"
  try {
    const localeRows = await ojsQuery<{ primary_locale: string }>(
      "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
      [journalId],
    )
    if (localeRows.length > 0 && localeRows[0].primary_locale) {
      primaryLocale = localeRows[0].primary_locale
    }
  } catch {
    // Proceed with default
  }

  // ── Parallel data fetches from all OJS sources ──────────────────────────

  const policySettingNames = STANDARD_POLICY_SETTINGS.map((s) => s.settingName)
  const policyPlaceholders = policySettingNames.map(() => "?").join(", ")

  const [configRows, menuRows, policySettingRows, staticPageRows, standaloneNavRows] = await Promise.all([
    // 1. DOI / Competing-Interests toggles
    ojsQuery<SettingRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name IN ('enableDois', 'requireAuthorCompetingInterests')
         AND (locale = ? OR locale = '')`,
      [journalId, primaryLocale],
    ).catch((err): SettingRow[] => {
      console.error(`[JournalPolicies] Failed to load DOI/competing-interests config for journal_id=${journalId}:`, err)
      return []
    }),

    // 2. Navigation menu items from the "Journal Policies" custom menu
    ojsQuery<MenuRow>(
      `SELECT
          nmi.navigation_menu_item_id,
          nmi.path  AS slug,
          nmi.type,
          nmia.seq,
          nmis.setting_name,
          nmis.setting_value,
          nmis.locale
       FROM navigation_menus nm
       JOIN navigation_menu_item_assignments nmia
         ON nm.navigation_menu_id = nmia.navigation_menu_id
       JOIN navigation_menu_items nmi
         ON nmia.navigation_menu_item_id = nmi.navigation_menu_item_id
       LEFT JOIN navigation_menu_item_settings nmis
         ON nmi.navigation_menu_item_id = nmis.navigation_menu_item_id
       WHERE nm.title = 'Journal Policies'
         AND nm.context_id = ?
       ORDER BY nmia.seq ASC`,
      [journalId],
    ).catch((err): MenuRow[] => {
      console.error(`[JournalPolicies] Failed to load "Journal Policies" navigation menu for journal_id=${journalId}:`, err)
      return []
    }),

    // 3. Standard policy fields from journal_settings (content source + fallback)
    ojsQuery<SettingRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name IN (${policyPlaceholders})
         AND (locale = ? OR locale = '')`,
      [journalId, ...policySettingNames, primaryLocale],
    ).catch((err): SettingRow[] => {
      console.error(`[JournalPolicies] Failed to load standard policy settings for journal_id=${journalId}:`, err)
      return []
    }),

    // 4. Static pages (plugin-managed content — table may not exist)
    ojsQuery<StaticPageRow>(
      `SELECT
          sp.static_page_id,
          sp.path,
          sps.setting_name,
          sps.setting_value,
          sps.locale
       FROM static_pages sp
       LEFT JOIN static_page_settings sps
         ON sp.static_page_id = sps.static_page_id
       WHERE sp.context_id = ?`,
      [journalId],
    ).catch((err): StaticPageRow[] => {
      console.error(`[JournalPolicies] Failed to load static pages for journal_id=${journalId}:`, err)
      return []
    }),

    // 5. ALL standalone navigation_menu_items with content for this journal.
    //    This catches policy pages stored as CMS items (same pattern as
    //    editorial-board) that are NOT assigned to the "Journal Policies" menu.
    ojsQuery<StandaloneNavRow>(
      `SELECT
          nmi.navigation_menu_item_id,
          nmi.path,
          nmi.type,
          nmis.setting_name,
          nmis.setting_value,
          nmis.locale
       FROM navigation_menu_items nmi
       LEFT JOIN navigation_menu_item_settings nmis
         ON nmi.navigation_menu_item_id = nmis.navigation_menu_item_id
       WHERE nmi.context_id = ?
         AND nmi.path IS NOT NULL
         AND nmi.path != ''`,
      [journalId],
    ).catch((err): StandaloneNavRow[] => {
      console.error(`[JournalPolicies] Failed to load standalone nav items for journal_id=${journalId}:`, err)
      return []
    }),
  ])

  // ── Config toggles ─────────────────────────────────────────────────────

  const doiRaw = pickBestLocale(configRows, "enableDois", primaryLocale)
  const competingInterestsRaw = pickBestLocale(configRows, "requireAuthorCompetingInterests", primaryLocale)

  // ── SOURCE 1 — Navigation menu items ────────────────────────────────────

  const menuTabs: PolicyTab[] = []
  const usedSettingNames = new Set<string>()
  const usedStaticPageIds = new Set<number>()
  const usedSlugs = new Set<string>()
  const usedNavItemIds = new Set<number>()

  if (menuRows.length > 0) {
    // Group flat EAV rows by navigation_menu_item_id
    const itemsMap = new Map<
      number,
      {
        id: number
        slug: string
        type: string
        seq: number
        settings: { setting_name: string; setting_value: string | null; locale: string }[]
      }
    >()

    for (const row of menuRows) {
      if (!itemsMap.has(row.navigation_menu_item_id)) {
        itemsMap.set(row.navigation_menu_item_id, {
          id: row.navigation_menu_item_id,
          slug: row.slug,
          type: row.type || "",
          seq: row.seq,
          settings: [],
        })
      }
      if (row.setting_name) {
        itemsMap.get(row.navigation_menu_item_id)!.settings.push({
          setting_name: row.setting_name,
          setting_value: row.setting_value,
          locale: row.locale,
        })
      }
    }

    const sortedItems = Array.from(itemsMap.values()).sort((a, b) => a.seq - b.seq)

    for (const item of sortedItems) {
      let title = pickBestLocale(item.settings, "title", primaryLocale) || ""
      let content: string | null = null

      // Built-in types resolve content from journal_settings
      const builtinMapping = BUILTIN_TYPE_TO_SETTING[item.type]
      if (builtinMapping) {
        content = pickBestLocale(policySettingRows, builtinMapping.settingName, primaryLocale)
        usedSettingNames.add(builtinMapping.settingName)
        if (!title) title = builtinMapping.defaultTitle
      }

      // Custom types / fallback: content from navigation_menu_item_settings
      if (!content) {
        content = pickBestLocale(item.settings, "content", primaryLocale)
      }

      // If the slug references a static page, try to resolve from there
      if (!content && item.slug) {
        const matching = staticPageRows.filter((r) => r.path === item.slug)
        if (matching.length > 0) {
          content = pickBestLocale(
            matching.map((r) => ({
              setting_name: r.setting_name,
              setting_value: r.setting_value,
              locale: r.locale,
            })),
            "content",
            primaryLocale,
          )
          for (const r of matching) usedStaticPageIds.add(r.static_page_id)
        }
      }

      const sanitized = sanitizePolicy(content)
      if (!sanitized.trim()) continue

      if (!title) title = "Policy"

      // Track this nav item as consumed so SOURCE 4 doesn't duplicate it
      usedNavItemIds.add(item.id)

      // Generate unique slug, appending numeric suffix if necessary
      let baseSlug = item.slug || makeSlug(title)
      let finalSlug = baseSlug
      let counter = 2
      while (usedSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`
        counter++
      }
      usedSlugs.add(finalSlug)

      menuTabs.push({
        title,
        slug: finalSlug,
        content: sanitized,
      })
    }
  }

  // ── SOURCE 4 — Standalone navigation menu items (not in any named menu) ──
  //
  // OJS stores custom CMS pages as navigation_menu_items with a path and
  // content in navigation_menu_item_settings.  These may or may not be
  // assigned to a navigation menu.  This source catches policy pages that
  // exist as standalone items — the same pattern used by editorial-board.

  const standaloneTabs: PolicyTab[] = []

  if (standaloneNavRows.length > 0) {
    const standaloneMap = new Map<
      number,
      {
        path: string
        type: string
        settings: { setting_name: string; setting_value: string | null; locale: string }[]
      }
    >()

    for (const row of standaloneNavRows) {
      // Skip items already collected via SOURCE 1 (menu-assigned items)
      if (usedNavItemIds.has(row.navigation_menu_item_id)) continue

      if (!standaloneMap.has(row.navigation_menu_item_id)) {
        standaloneMap.set(row.navigation_menu_item_id, {
          path: row.path,
          type: row.type || "",
          settings: [],
        })
      }
      if (row.setting_name) {
        standaloneMap.get(row.navigation_menu_item_id)!.settings.push({
          setting_name: row.setting_name,
          setting_value: row.setting_value,
          locale: row.locale,
        })
      }
    }

    for (const [, item] of standaloneMap) {
      // Skip items whose slug is already covered by a menu tab
      if (usedSlugs.has(item.path)) continue

      let title = pickBestLocale(item.settings, "title", primaryLocale) || ""
      let content: string | null = null

      // Built-in types resolve content from journal_settings
      const builtinMapping = BUILTIN_TYPE_TO_SETTING[item.type]
      if (builtinMapping) {
        content = pickBestLocale(policySettingRows, builtinMapping.settingName, primaryLocale)
        usedSettingNames.add(builtinMapping.settingName)
        if (!title) title = builtinMapping.defaultTitle
      }

      // Content from navigation_menu_item_settings
      if (!content) {
        content = pickBestLocale(item.settings, "content", primaryLocale)
      }

      // Try static page with same path
      if (!content && item.path) {
        const matching = staticPageRows.filter((r) => r.path === item.path)
        if (matching.length > 0) {
          content = pickBestLocale(
            matching.map((r) => ({
              setting_name: r.setting_name,
              setting_value: r.setting_value,
              locale: r.locale,
            })),
            "content",
            primaryLocale,
          )
          for (const r of matching) usedStaticPageIds.add(r.static_page_id)
        }
      }

      const sanitized = sanitizePolicy(content)
      if (!sanitized.trim()) continue

      // Derive a human-readable title from the path if no title setting exists
      if (!title) {
        title = item.path
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      }

      usedSlugs.add(item.path)
      standaloneTabs.push({
        title,
        slug: item.path,
        content: sanitized,
      })
    }
  }

  // ── SOURCE 2 — journal_settings fallback ────────────────────────────────
  // Add standard policy settings not already covered by the navigation menu.

  const settingsTabs: PolicyTab[] = []

  for (const spec of STANDARD_POLICY_SETTINGS) {
    if (usedSettingNames.has(spec.settingName)) continue

    // Also skip if a menu tab already covers this slug
    if (usedSlugs.has(spec.slug)) continue

    const raw = pickBestLocale(policySettingRows, spec.settingName, primaryLocale)
    const sanitized = sanitizePolicy(raw)
    if (!sanitized.trim()) continue

    usedSlugs.add(spec.slug)
    settingsTabs.push({
      title: spec.defaultTitle,
      slug: spec.slug,
      content: sanitized,
    })
  }

  // ── SOURCE 3 — Static pages not already linked via navigation menu ──────

  const staticTabs: PolicyTab[] = []
  const staticPagesMap = new Map<
    number,
    { path: string; settings: { setting_name: string; setting_value: string | null; locale: string }[] }
  >()

  for (const row of staticPageRows) {
    if (usedStaticPageIds.has(row.static_page_id)) continue
    if (!staticPagesMap.has(row.static_page_id)) {
      staticPagesMap.set(row.static_page_id, { path: row.path, settings: [] })
    }
    if (row.setting_name) {
      staticPagesMap.get(row.static_page_id)!.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }

  for (const [, page] of staticPagesMap) {
    const title = pickBestLocale(page.settings, "title", primaryLocale)
    const raw = pickBestLocale(page.settings, "content", primaryLocale)
    const sanitized = sanitizePolicy(raw)
    if (!sanitized.trim()) continue

    let slug = page.path || makeSlug(title || "page")

    // Deduplicate against already-collected tabs, appending suffix if needed
    if (usedSlugs.has(slug)) {
      let counter = 2
      let finalSlug = `${slug}-${counter}`
      while (usedSlugs.has(finalSlug)) {
        counter++
        finalSlug = `${slug}-${counter}`
      }
      slug = finalSlug
    }
    usedSlugs.add(slug)

    staticTabs.push({
      title: title || page.path || "Policy",
      slug,
      content: sanitized,
    })
  }

  // ── Merge — menu tabs first (explicit ordering), then standalone nav items,
  // then journal_settings fallback, then static pages

  const tabs: PolicyTab[] = [...menuTabs, ...standaloneTabs, ...settingsTabs, ...staticTabs]

  return {
    tabs,
    doiEnabled: doiRaw === "1" || doiRaw === "true",
    requireAuthorCompetingInterestsEnabled: competingInterestsRaw === "1" || competingInterestsRaw === "true",
  }
}
