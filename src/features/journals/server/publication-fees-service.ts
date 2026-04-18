/**
 * Publication Fees Service
 *
 * On OJS, "Publication Fees" is authored as a page — either a custom
 * navigation menu item or a static page from the static-pages plugin — not as
 * the numeric `journal_settings.publicationFee` scalar. That scalar is driven
 * by the Payments plugin (often disabled), so relying on it for display
 * produces a misleading "No Charges" banner even when the journal publishes a
 * page stating e.g. "Publication Fee: 150.00 EUR".
 *
 * This service resolves the authoritative page content with the following
 * priority:
 *   1. `navigation_menu_items` whose title or path matches a Publication Fees
 *      alias, reading the `content` setting from `navigation_menu_item_settings`.
 *   2. `static_pages` plugin with a matching `path`, reading `content` from
 *      `static_page_settings` (only when the plugin table exists).
 *   3. `journal_settings.publicationFeeDescription` as a last-resort fallback.
 *
 * Only returns a page if it carries real HTML content. When nothing matches,
 * callers can fall back to rendering the numeric fee (or hiding the section).
 */
import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

interface NavSettingRow {
  navigation_menu_item_id: number
  path: string | null
  type: string | null
  setting_name: string | null
  setting_value: string | null
  locale: string
}

interface StaticPageRow {
  static_page_id: number
  path: string | null
  setting_name: string | null
  setting_value: string | null
  locale: string
}

interface JournalSettingRow {
  setting_name: string
  setting_value: string | null
  locale: string
}

export interface PublicationFeesPage {
  /** Title of the page as authored on OJS (for display / aria-labelledby) */
  title: string | null
  /** Sanitized HTML body, or null when no page is configured */
  content: string | null
  /** Where the content came from — useful for debugging */
  source: "navigation_menu" | "static_page" | "journal_settings" | null
}

const EMPTY: PublicationFeesPage = { title: null, content: null, source: null }

// Normalized aliases for matching — "Publication Fees" appears in many
// localized forms. Normalization collapses punctuation and whitespace so
// "publication-fees", "Publication Fees", "PUBLICATION  FEES" all collide.
const PUBLICATION_FEES_ALIASES = new Set(
  [
    "publication fees",
    "publication fee",
    "article processing charges",
    "article processing charge",
    "apc",
    "apcs",
    "author fees",
    "author fee",
    "processing fees",
    "processing fee",
    "fees",
    "tasas de publicacion",
    "frais de publication",
    "tarifas de publicacion",
  ].map(normalizeKey),
)

function normalizeKey(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function pickBestLocale(
  rows: Array<{ setting_name: string | null; setting_value: string | null; locale: string }>,
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

const FEES_SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div",
    "table", "tbody", "tr", "td", "th", "thead",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    "*": ["class", "style"],
  },
}

function sanitize(raw: string | null | undefined): string {
  if (!raw) return ""
  return sanitizeHtml(raw, FEES_SANITIZE_OPTIONS).trim()
}

export async function fetchPublicationFeesPage(
  ojsJournalId: string,
): Promise<PublicationFeesPage> {
  if (!/^\d+$/.test(ojsJournalId)) return EMPTY
  const journalId = parseInt(ojsJournalId, 10)

  // Resolve primary locale once; falls back to "en" if the lookup fails.
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

  const [navRows, staticPageRows, journalSettingRows] = await Promise.all([
    ojsQuery<NavSettingRow>(
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
       WHERE nmi.context_id = ?`,
      [journalId],
    ).catch((err): NavSettingRow[] => {
      console.error(
        `[PublicationFees] Failed to load navigation menu items for journal_id=${journalId}:`,
        err,
      )
      return []
    }),
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
    ).catch((err: unknown): StaticPageRow[] => {
      // The static_pages plugin table is optional — silently swallow missing
      // table errors (ER_NO_SUCH_TABLE / 1146), log everything else.
      if (err instanceof Error) {
        const msg = err.message || ""
        if (msg.includes("ER_NO_SUCH_TABLE") || msg.includes("1146")) return []
      }
      console.error(
        `[PublicationFees] Failed to load static pages for journal_id=${journalId}:`,
        err,
      )
      return []
    }),
    ojsQuery<JournalSettingRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name = 'publicationFeeDescription'
         AND (locale = ? OR locale = '')`,
      [journalId, primaryLocale],
    ).catch((err): JournalSettingRow[] => {
      console.error(
        `[PublicationFees] Failed to load publicationFeeDescription for journal_id=${journalId}:`,
        err,
      )
      return []
    }),
  ])

  // ── Source 1: navigation menu items ─────────────────────────────────────
  const navMap = new Map<
    number,
    {
      path: string | null
      type: string | null
      settings: Array<{ setting_name: string | null; setting_value: string | null; locale: string }>
    }
  >()
  for (const row of navRows) {
    if (!navMap.has(row.navigation_menu_item_id)) {
      navMap.set(row.navigation_menu_item_id, {
        path: row.path,
        type: row.type,
        settings: [],
      })
    }
    if (row.setting_name) {
      navMap.get(row.navigation_menu_item_id)!.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }

  for (const [, item] of navMap) {
    const titleHint = pickBestLocale(item.settings, "title", primaryLocale)
    const candidates = [titleHint, item.path].map(normalizeKey).filter(Boolean)
    if (!candidates.some((k) => PUBLICATION_FEES_ALIASES.has(k))) continue

    const content = pickBestLocale(item.settings, "content", primaryLocale)
    const sanitized = sanitize(content)
    if (!sanitized) continue

    return {
      title: titleHint,
      content: sanitized,
      source: "navigation_menu",
    }
  }

  // ── Source 2: static_pages plugin ───────────────────────────────────────
  const staticMap = new Map<
    number,
    {
      path: string | null
      settings: Array<{ setting_name: string | null; setting_value: string | null; locale: string }>
    }
  >()
  for (const row of staticPageRows) {
    if (!staticMap.has(row.static_page_id)) {
      staticMap.set(row.static_page_id, { path: row.path, settings: [] })
    }
    if (row.setting_name) {
      staticMap.get(row.static_page_id)!.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }

  for (const [, page] of staticMap) {
    const titleHint = pickBestLocale(page.settings, "title", primaryLocale)
    const candidates = [titleHint, page.path].map(normalizeKey).filter(Boolean)
    if (!candidates.some((k) => PUBLICATION_FEES_ALIASES.has(k))) continue

    const content = pickBestLocale(page.settings, "content", primaryLocale)
    const sanitized = sanitize(content)
    if (!sanitized) continue

    return {
      title: titleHint,
      content: sanitized,
      source: "static_page",
    }
  }

  // ── Source 3: journal_settings.publicationFeeDescription fallback ──────
  const fallback = pickBestLocale(
    journalSettingRows.map((r) => ({
      setting_name: r.setting_name,
      setting_value: r.setting_value,
      locale: r.locale,
    })),
    "publicationFeeDescription",
    primaryLocale,
  )
  const sanitizedFallback = sanitize(fallback)
  if (sanitizedFallback) {
    return {
      title: "Publication Fees",
      content: sanitizedFallback,
      source: "journal_settings",
    }
  }

  return EMPTY
}
