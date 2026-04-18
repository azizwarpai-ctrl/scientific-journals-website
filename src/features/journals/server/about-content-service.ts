/**
 * Journal About-Content Service
 *
 * Many OJS installations keep "Aims of the Journal" and "Scope of the Journal"
 * as prose inside a custom navigation-menu page (usually "About the Journal"),
 * rather than in the structured `aimsAndScope` journal_settings field. When that
 * setting is empty or only holds a placeholder, the visible Home/About content
 * is the source of truth.
 *
 * This service probes OJS in priority order:
 *   1. `journal_settings.aimsAndScope` (the legacy structured field).
 *   2. A custom page under `navigation_menu_items` whose path/title matches
 *      "about" (aboutTheJournal, about, aboutJournal, etc.).
 *   3. A matching page in the StaticPagesPlugin `static_pages` table.
 *
 * It then feeds whichever HTML block is richest into the existing
 * `parseAimsAndScope` parser so consumers can render Aims and Scope as two
 * separate cards when the block has clear headings, or one combined card when
 * it's a single narrative.
 */

import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { parseAimsAndScope, type AimsScopeParts } from "@/src/features/journals/utils/aims-scope-parser"

export interface JournalAboutContent extends AimsScopeParts {
  /** Which OJS location the HTML came from, for diagnostics. */
  source: "journal_settings" | "navigation_menu" | "static_page" | null
}

const ABOUT_PAGE_ALIASES = new Set<string>([
  "about",
  "about journal",
  "about the journal",
  "aboutjournal",
  "aboutthejournal",
  "journal information",
  "information about the journal",
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

function isAboutAlias(value: string | null | undefined): boolean {
  const norm = normalizeKey(value)
  if (!norm) return false
  if (ABOUT_PAGE_ALIASES.has(norm)) return true
  // Match variations like "about our journal", "about <name>", "the journal".
  return /\babout\b.*\bjournal\b|\babout\s+(?:the\s+)?journal\b/.test(norm)
}

const SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "span", "div",
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

/**
 * Decide whether an HTML block is rich enough to use.
 * An empty string, whitespace, or a block that sanitizes down to nothing
 * should be treated as absent so the next source wins.
 */
function hasUsableContent(html: string | null): boolean {
  if (!html) return false
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim()
  return text.length >= 16
}

/**
 * A parsed block is "preferred" only when the parser cleanly split it into
 * distinct aims/scope parts. Otherwise we keep probing for a block that does.
 */
function hasSplitParts(parts: AimsScopeParts): boolean {
  return !!(parts.aims && parts.scope)
}

export async function fetchJournalAboutContent(ojsJournalId: string): Promise<JournalAboutContent> {
  const empty: JournalAboutContent = {
    aims: null,
    scope: null,
    combined: null,
    source: null,
  }

  if (!/^\d+$/.test(ojsJournalId)) return empty
  const journalId = parseInt(ojsJournalId, 10)

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

  const [aimsRows, navRows, staticRows] = await Promise.all([
    ojsQuery<SettingRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name = 'aimsAndScope'
         AND (locale = ? OR locale = '')`,
      [journalId, primaryLocale],
    ).catch((err): SettingRow[] => {
      console.warn(`[AboutContent] aimsAndScope lookup failed for journal_id=${journalId}:`, (err as Error).message)
      return []
    }),

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
      console.warn(`[AboutContent] navigation_menu_items lookup failed for journal_id=${journalId}:`, (err as Error).message)
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
    ).catch((err): StaticPageRow[] => {
      console.warn(`[AboutContent] static_pages lookup failed for journal_id=${journalId}:`, (err as Error).message)
      return []
    }),
  ])

  const candidates: Array<{ html: string; source: JournalAboutContent["source"] }> = []

  // 1. Structured aimsAndScope setting (sanitized).
  const structuredRaw = pickBestLocale(aimsRows, "aimsAndScope", primaryLocale)
  const structuredHtml = sanitize(structuredRaw)
  if (hasUsableContent(structuredHtml)) {
    candidates.push({ html: structuredHtml, source: "journal_settings" })
  }

  // 2. Custom navigation-menu "About" page.
  const navGroups = groupByItemId(navRows)
  for (const item of navGroups.values()) {
    const titleHint = pickBestLocale(item.settings, "title", primaryLocale)
    const matches = isAboutAlias(item.path) || isAboutAlias(titleHint)
    if (!matches) continue

    const raw = pickBestLocale(item.settings, "content", primaryLocale)
    const sanitized = sanitize(raw)
    if (hasUsableContent(sanitized)) {
      candidates.push({ html: sanitized, source: "navigation_menu" })
      break
    }
  }

  // 3. StaticPagesPlugin "About" page.
  const staticGroups = groupStaticPages(staticRows)
  for (const page of staticGroups.values()) {
    const titleHint = pickBestLocale(page.settings, "title", primaryLocale)
    const matches = isAboutAlias(page.path) || isAboutAlias(titleHint)
    if (!matches) continue

    const raw = pickBestLocale(page.settings, "content", primaryLocale)
    const sanitized = sanitize(raw)
    if (hasUsableContent(sanitized)) {
      candidates.push({ html: sanitized, source: "static_page" })
      break
    }
  }

  if (candidates.length === 0) return empty

  // Prefer the first candidate that splits cleanly into aims + scope. If none
  // does, fall back to the first candidate and expose it as `combined`.
  let chosen: { parts: AimsScopeParts; source: JournalAboutContent["source"] } | null = null
  for (const cand of candidates) {
    const parts = parseAimsAndScope(cand.html)
    if (hasSplitParts(parts)) {
      chosen = { parts, source: cand.source }
      break
    }
    if (!chosen) {
      chosen = { parts, source: cand.source }
    }
  }

  if (!chosen) return empty

  return {
    aims: chosen.parts.aims,
    scope: chosen.parts.scope,
    combined: chosen.parts.combined,
    source: chosen.source,
  }
}
