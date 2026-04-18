/**
 * Publication Fees Service
 *
 * Returns a journal's publication-fee information sourced from OJS.
 *
 * OJS installations expose fees through a variety of mechanisms:
 *   1. A custom page added under "Navigation Menu Items" (e.g. path
 *      'publicationFees'), with an HTML content setting.
 *   2. The StaticPagesPlugin's `static_pages` table, same shape.
 *   3. The built-in payments plugin, stored as structured
 *      `publicationFee` / `submissionFee` numeric settings plus an HTML
 *      `publicationFeeDescription`.
 *
 * This service probes all three and prefers the richest content it finds
 * (custom page HTML over a plain amount), so the platform always shows what
 * authors actually see on SubmitManager.
 */

import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

export interface PublicationFees {
  /** Rich HTML content (sanitized) sourced from a custom OJS page, when present. */
  html: string | null
  /** Numeric publication fee from structured OJS settings (may be 0). */
  publicationFee: number | null
  /** Numeric submission fee from structured OJS settings (may be 0). */
  submissionFee: number | null
  /** HTML description linked to the numeric fees (if configured). */
  description: string | null
  /** ISO-4217 currency code from OJS payments settings (e.g. "EUR"). */
  currencyCode: string | null
  /** Which OJS source the rich HTML came from, for diagnostics. */
  source: "navigation_menu" | "static_page" | "journal_settings" | null
}

// ── Normalization & alias matching ─────────────────────────────────────────

/** Aliases that identify a publication-fees custom page on OJS. */
const FEE_PAGE_ALIASES = new Set<string>([
  "publicationfees",
  "publication fees",
  "fees",
  "apc",
  "article processing charges",
  "article processing charge",
  "publication charges",
  "publication charge",
])

function normalizeKey(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isFeeAlias(value: string | null | undefined): boolean {
  const norm = normalizeKey(value)
  if (!norm) return false
  if (FEE_PAGE_ALIASES.has(norm)) return true
  // Also match variations of publication fees/charges or APC embedded in longer titles.
  return /\b(?:publication|article\s+processing)\s+(?:fees?|charges?|apc|apcs)\b/.test(norm)
}

// ── Sanitization ───────────────────────────────────────────────────────────

const SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "h5", "blockquote", "span", "div",
    "table", "tbody", "tr", "td", "th", "thead", "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    "*": ["class"],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
}

function sanitize(raw: string | null | undefined): string {
  if (!raw) return ""
  return sanitizeHtml(raw, SANITIZE_OPTIONS).trim()
}

// ── Locale helper ──────────────────────────────────────────────────────────

function pickBestLocale(
  rows: { setting_name: string; setting_value: string | null; locale: string }[],
  settingName: string,
  primaryLocale: string,
): string | null {
  const matching = rows.filter((r) => r.setting_name === settingName)
  if (matching.length === 0) return null
  return (
    matching.find((r) => r.locale === primaryLocale)?.setting_value ??
    matching.find((r) => r.locale === "")?.setting_value ??
    matching[0]?.setting_value ??
    null
  )
}

function parseFeeAmount(value: string | null | undefined): number | null {
  if (value == null) return null
  let normalized = String(value).replace(/[^0-9.,\-]/g, "").trim()
  if (!normalized) return null

  // Handle thousands/decimal separators: if both . and , exist, the last one is the decimal marker.
  // e.g. "1.500,00" → "1500.00" (EU format), "1,234.56" → "1234.56" (US format)
  const lastDot = normalized.lastIndexOf(".")
  const lastComma = normalized.lastIndexOf(",")

  if (lastDot > -1 && lastComma > -1) {
    // Both exist: last one is decimal, remove the other
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".")
    } else {
      normalized = normalized.replace(/,/g, "")
    }
  } else if (lastComma > -1) {
    // Only comma: EU-style, convert to decimal point
    normalized = normalized.replace(",", ".")
  }
  // If only dot, or neither, proceed as-is

  const n = parseFloat(normalized)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// ── Row types ──────────────────────────────────────────────────────────────

interface NavRow {
  navigation_menu_item_id: number
  path: string | null
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

interface SettingRow {
  setting_name: string
  setting_value: string | null
  locale: string
}

// ── Main entry point ───────────────────────────────────────────────────────

export async function fetchJournalPublicationFees(ojsJournalId: string): Promise<PublicationFees> {
  const empty: PublicationFees = {
    html: null,
    publicationFee: null,
    submissionFee: null,
    description: null,
    currencyCode: null,
    source: null,
  }

  if (!/^\d+$/.test(ojsJournalId)) return empty
  const journalId = parseInt(ojsJournalId, 10)

  // Resolve primary locale (falls back to 'en' if the lookup fails).
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
    // Keep default.
  }

  const [navRows, staticRows, settingRows] = await Promise.all([
    // Custom navigation-menu pages on this journal (context_id = journal_id)
    ojsQuery<NavRow>(
      `SELECT
          nmi.navigation_menu_item_id,
          nmi.path,
          nmis.setting_name,
          nmis.setting_value,
          nmis.locale
       FROM navigation_menu_items nmi
       LEFT JOIN navigation_menu_item_settings nmis
         ON nmi.navigation_menu_item_id = nmis.navigation_menu_item_id
       WHERE nmi.context_id = ?`,
      [journalId],
    ).catch((err): NavRow[] => {
      console.warn(`[PublicationFees] navigation_menu_items lookup failed for journal_id=${journalId}:`, (err as Error).message)
      return []
    }),

    // StaticPagesPlugin pages (table may not exist on every OJS install)
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
      console.warn(`[PublicationFees] static_pages lookup failed for journal_id=${journalId}:`, (err as Error).message)
      return []
    }),

    // Structured payments-plugin settings
    ojsQuery<SettingRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name IN ('publicationFee', 'submissionFee', 'publicationFeeDescription', 'currency')
         AND (locale = ? OR locale = '')`,
      [journalId, primaryLocale],
    ).catch((err): SettingRow[] => {
      console.warn(`[PublicationFees] journal_settings lookup failed for journal_id=${journalId}:`, (err as Error).message)
      return []
    }),
  ])

  // ── 1. Look for a custom navigation-menu page titled/pathed like fees ──
  let html: string | null = null
  let source: PublicationFees["source"] = null

  const navGroups = groupByItemId(navRows)
  for (const item of navGroups.values()) {
    const titleHint = pickBestLocale(item.settings, "title", primaryLocale)
    const matches = isFeeAlias(item.path) || isFeeAlias(titleHint)
    if (!matches) continue

    const raw = pickBestLocale(item.settings, "content", primaryLocale)
    const sanitized = sanitize(raw)
    if (sanitized) {
      html = sanitized
      source = "navigation_menu"
      break
    }
  }

  // ── 2. Fall back to a static page with a matching path/title ──
  if (!html) {
    const staticGroups = groupStaticPages(staticRows)
    for (const page of staticGroups.values()) {
      const titleHint = pickBestLocale(page.settings, "title", primaryLocale)
      const matches = isFeeAlias(page.path) || isFeeAlias(titleHint)
      if (!matches) continue

      const raw = pickBestLocale(page.settings, "content", primaryLocale)
      const sanitized = sanitize(raw)
      if (sanitized) {
        html = sanitized
        source = "static_page"
        break
      }
    }
  }

  // ── 3. Structured fees from the payments plugin ──
  const publicationFee = parseFeeAmount(pickBestLocale(settingRows, "publicationFee", primaryLocale))
  const submissionFee = parseFeeAmount(pickBestLocale(settingRows, "submissionFee", primaryLocale))
  const description = sanitize(pickBestLocale(settingRows, "publicationFeeDescription", primaryLocale)) || null
  const currencyRaw = pickBestLocale(settingRows, "currency", primaryLocale)
  const currencyCode = currencyRaw ? currencyRaw.trim().toUpperCase() || null : null

  // If we only have a structured description (and no custom page), treat the
  // description as the rich HTML source so the UI can render it uniformly.
  if (!html && description) {
    html = description
    source = "journal_settings"
  }

  return {
    html,
    publicationFee,
    submissionFee,
    description,
    currencyCode,
    source,
  }
}

// ── Grouping helpers ───────────────────────────────────────────────────────

interface GroupedItem {
  path: string | null
  settings: SettingRow[]
}

function groupByItemId(rows: NavRow[]): Map<number, GroupedItem> {
  const map = new Map<number, GroupedItem>()
  for (const row of rows) {
    let entry = map.get(row.navigation_menu_item_id)
    if (!entry) {
      entry = { path: row.path ?? null, settings: [] }
      map.set(row.navigation_menu_item_id, entry)
    }
    if (row.setting_name) {
      entry.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }
  return map
}

function groupStaticPages(rows: StaticPageRow[]): Map<number, GroupedItem> {
  const map = new Map<number, GroupedItem>()
  for (const row of rows) {
    let entry = map.get(row.static_page_id)
    if (!entry) {
      entry = { path: row.path ?? null, settings: [] }
      map.set(row.static_page_id, entry)
    }
    if (row.setting_name) {
      entry.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }
  return map
}
