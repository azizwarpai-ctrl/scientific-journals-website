/**
 * Journal About-Content Service
 *
 * OJS exposes Aims & Scope through several distinct surfaces, in practice a
 * journal admin picks one and populates it. This service probes them in order:
 *
 *   1. A DEDICATED navigation-menu item whose path/title is a direct
 *      "aims-scope" alias (e.g. `path='aims-scope'`, title='Aims & Scope').
 *      When an OJS admin creates this item, its content is the explicit,
 *      source-of-truth block for Aims & Scope and must not be competed with.
 *   2. A DEDICATED StaticPagesPlugin page with the same aims-scope alias.
 *   3. The legacy structured `journal_settings.aimsAndScope` setting.
 *   4. A custom page under `navigation_menu_items` whose path/title matches
 *      "about" (aboutTheJournal, about, aboutJournal, etc.) — extraction
 *      fallback from mixed content.
 *   5. A matching About page in the StaticPagesPlugin `static_pages` table —
 *      extraction fallback.
 *
 * It feeds whichever HTML block is richest into the existing
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

/**
 * Slug-style aliases for dedicated Aims & Scope pages. These match the `path`
 * column verbatim (case-insensitive, trimmed) and cover the conventions OJS
 * admins commonly adopt when they create a bespoke "Aims & Scope" nav item.
 */
const AIMS_SCOPE_PATH_ALIASES = new Set<string>([
  "aims-scope",
  "aims-and-scope",
  "aimsandscope",
  "aimsscope",
  "aim-and-scope",
  "scope-and-aims",
  "scope-aims",
])

/**
 * Human-title aliases that identify a dedicated Aims & Scope nav item/page
 * (fallback when the admin set an unconventional path but a clear title).
 * Compared after `normalizeKey` so "Aims & Scope" → "aims and scope".
 */
const AIMS_SCOPE_TITLE_ALIASES = new Set<string>([
  "aims and scope",
  "aim and scope",
  "aims scope",
  "scope and aims",
  "scope aims",
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

function normalizePath(value: string | null | undefined): string {
  if (!value) return ""
  return value.toLowerCase().trim()
}

function isAboutAlias(value: string | null | undefined): boolean {
  const norm = normalizeKey(value)
  if (!norm) return false
  if (ABOUT_PAGE_ALIASES.has(norm)) return true
  // Match variations like "about our journal", "about <name>", "the journal".
  return /\babout\b.*\bjournal\b|\babout\s+(?:the\s+)?journal\b/.test(norm)
}

/**
 * True when a navigation-menu item or static page unambiguously represents a
 * dedicated Aims & Scope page (by path slug or by title).
 */
export function isAimsScopeAlias(
  path: string | null | undefined,
  title: string | null | undefined,
): boolean {
  const p = normalizePath(path)
  if (p && AIMS_SCOPE_PATH_ALIASES.has(p)) return true
  const t = normalizeKey(title)
  if (t && AIMS_SCOPE_TITLE_ALIASES.has(t)) return true
  return false
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

  const candidates: Array<{ html: string; source: JournalAboutContent["source"]; dedicated: boolean }> = []
  const navGroups = groupByItemId(navRows)
  const staticGroups = groupStaticPages(staticRows)

  // 1. Dedicated "aims-scope" navigation-menu item — when an OJS admin creates
  //    this item, its content is the explicit, source-of-truth block for Aims &
  //    Scope and supersedes the legacy aimsAndScope setting or About prose.
  //    Marked `dedicated` so the picker renders it as ONE unified block and does
  //    NOT split its internal "Aims of the Journal"/"Scope of the Journal"
  //    subsection headings into two separate cards.
  for (const item of navGroups.values()) {
    const titleHint = pickBestLocale(item.settings, "title", primaryLocale)
    if (!isAimsScopeAlias(item.path, titleHint)) continue
    const raw = pickBestLocale(item.settings, "content", primaryLocale)
    const sanitized = sanitize(raw)
    if (hasUsableContent(sanitized)) {
      candidates.push({ html: sanitized, source: "navigation_menu", dedicated: true })
      break
    }
  }

  // 2. Dedicated "aims-scope" StaticPagesPlugin page.
  for (const page of staticGroups.values()) {
    const titleHint = pickBestLocale(page.settings, "title", primaryLocale)
    if (!isAimsScopeAlias(page.path, titleHint)) continue
    const raw = pickBestLocale(page.settings, "content", primaryLocale)
    const sanitized = sanitize(raw)
    if (hasUsableContent(sanitized)) {
      candidates.push({ html: sanitized, source: "static_page", dedicated: true })
      break
    }
  }

  // 3. Structured aimsAndScope setting (sanitized).
  const structuredRaw = pickBestLocale(aimsRows, "aimsAndScope", primaryLocale)
  const structuredHtml = sanitize(structuredRaw)
  if (hasUsableContent(structuredHtml)) {
    candidates.push({ html: structuredHtml, source: "journal_settings", dedicated: false })
  }

  // 4. Extraction fallback — a generic "About" nav-menu page whose content
  //    mixes aims/scope into longer prose.
  for (const item of navGroups.values()) {
    const titleHint = pickBestLocale(item.settings, "title", primaryLocale)
    const matches = isAboutAlias(item.path) || isAboutAlias(titleHint)
    if (!matches) continue

    const raw = pickBestLocale(item.settings, "content", primaryLocale)
    const sanitized = sanitize(raw)
    if (hasUsableContent(sanitized)) {
      candidates.push({ html: sanitized, source: "navigation_menu", dedicated: false })
      break
    }
  }

  // 5. Extraction fallback — StaticPagesPlugin "About" page.
  for (const page of staticGroups.values()) {
    const titleHint = pickBestLocale(page.settings, "title", primaryLocale)
    const matches = isAboutAlias(page.path) || isAboutAlias(titleHint)
    if (!matches) continue

    const raw = pickBestLocale(page.settings, "content", primaryLocale)
    const sanitized = sanitize(raw)
    if (hasUsableContent(sanitized)) {
      candidates.push({ html: sanitized, source: "static_page", dedicated: false })
      break
    }
  }

  if (candidates.length === 0) return empty

  // Pick a candidate. A DEDICATED candidate wins immediately and is rendered as
  // ONE unified block (combined only) — the admin authored a single page and
  // its internal "Aims of the Journal"/"Scope of the Journal" subsection
  // headings are authored structure, not a signal to split into two cards.
  // For non-dedicated candidates, prefer a clean aims/scope split when the
  // parser can find it, falling back to combined.
  let chosen: { parts: AimsScopeParts; source: JournalAboutContent["source"] } | null = null
  for (const cand of candidates) {
    if (cand.dedicated) {
      chosen = {
        parts: { aims: null, scope: null, combined: cand.html },
        source: cand.source,
      }
      break
    }
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
