/**
 * Custom Blocks Service
 *
 * Fetches sidebar blocks managed by the OJS Custom Block Manager plugin
 * directly from the OJS MySQL database.
 *
 * OJS Schema (plugin_settings table):
 *   plugin_name = 'customblockmanagerplugin'
 *   setting_name = 'blocks'
 *   setting_value = JSON array of block machine-names, e.g. ["myblock","infoblock"]
 *
 *   Per block:
 *   plugin_name = '{blockName}customblockplugin'
 *   setting_name = 'blockContent'
 *   setting_value = localized HTML (locale = primaryLocale or '')
 *
 *   context_id = journal_id (FK → journals.journal_id)
 *
 * Two-phase query strategy:
 * 1. Get list of block names from the manager plugin
 * 2. For each block name, fetch its HTML content
 */

import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import type { CustomBlock } from "@/src/features/journals/types/custom-block-types"

// Permitted HTML tags in custom block content (generous but safe)
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u",
  "ul", "ol", "li",
  "h2", "h3", "h4", "h5",
  "a", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
  "img",
  "blockquote",
  "hr",
]

const ALLOWED_ATTRS: Record<string, Array<string | { name: string; values: string[] }>> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  span: ["class"],
  div: ["class"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
}

interface PluginBlockRow {
  setting_value: string | null
}

/**
 * Fetch custom sidebar blocks for the given OJS journal.
 *
 * Returns sanitized HTML content for each block. Blocks without
 * content (empty or missing) are silently skipped.
 *
 * @param ojsJournalId - The OJS journal_id (numeric string)
 * @param primaryLocale - The journal's primary locale (e.g. "en_US")
 * @returns Array of CustomBlock with name and sanitized HTML content
 */
export async function fetchCustomBlocks(
  ojsJournalId: string,
  primaryLocale: string
): Promise<CustomBlock[]> {
  if (!/^\d+$/.test(ojsJournalId)) {
    console.error("[CustomBlocks] Invalid OJS journal ID:", ojsJournalId)
    return []
  }

  const journalId = parseInt(ojsJournalId, 10)

  // ── Phase 1: Get list of block names ──
  const managerRows = await ojsQuery<PluginBlockRow>(
    `SELECT setting_value
     FROM plugin_settings
     WHERE plugin_name = 'customblockmanagerplugin'
       AND setting_name = 'blocks'
       AND context_id = ?
     LIMIT 1`,
    [journalId]
  )

  if (managerRows.length === 0 || !managerRows[0].setting_value) {
    console.log(`[CustomBlocks] No custom blocks configured for journal_id=${journalId}`)
    return []
  }

  // Parse the JSON array of block names
  let blockNames: string[]
  try {
    const parsed = JSON.parse(managerRows[0].setting_value)
    if (!Array.isArray(parsed)) {
      console.warn("[CustomBlocks] Unexpected blocks format — expected JSON array")
      return []
    }
    blockNames = parsed.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
  } catch {
    console.warn("[CustomBlocks] Failed to parse block names JSON")
    return []
  }

  if (blockNames.length === 0) return []

  console.log(`[CustomBlocks] journal_id=${journalId}: found ${blockNames.length} block(s): ${blockNames.join(", ")}`)

  // ── Phase 2: Fetch content for each block ──
  // Query in a single IN clause by constructing plugin names array.
  // Plugin name convention: '{blockName}customblockplugin' (all lowercase).
  const pluginNames = blockNames.map((n) => `${n.toLowerCase()}customblockplugin`)

  // Fetch localized content first, then empty-locale fallback
  const contentRows = await ojsQuery<{ plugin_name: string; setting_value: string | null; locale: string }>(
    `SELECT plugin_name, setting_value, locale
     FROM plugin_settings
     WHERE plugin_name IN (?)
       AND setting_name = 'blockContent'
       AND context_id = ?
       AND locale IN (?, '')
     ORDER BY plugin_name, locale DESC`,
    [pluginNames, journalId, primaryLocale]
  )

  // Build map: pluginName → best content (prefer primaryLocale over '')
  const contentMap = new Map<string, string>()
  for (const row of contentRows) {
    if (!row.setting_value) continue
    // Only set if not already set (first = highest priority due to ORDER BY locale DESC)
    if (!contentMap.has(row.plugin_name)) {
      contentMap.set(row.plugin_name, row.setting_value)
    }
  }

  // ── Phase 3: Map to domain objects, sanitize HTML ──
  const blocks: CustomBlock[] = []

  for (const name of blockNames) {
    const pluginName = `${name.toLowerCase()}customblockplugin`
    const rawContent = contentMap.get(pluginName)

    if (!rawContent) continue

    const cleanContent = sanitizeHtml(rawContent, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRS,
      // Force external links to open safely
      transformTags: {
        a: (tagName: string, attribs: { [attr: string]: string }) => ({
          tagName,
          attribs: {
            ...attribs,
            rel: "noopener noreferrer",
            target: attribs["target"] || "_blank",
          },
        }),
      },
    }).trim()

    if (!cleanContent) continue

    blocks.push({ name, content: cleanContent })
  }

  console.log(`[CustomBlocks] journal_id=${journalId}: returning ${blocks.length} block(s) with content`)
  return blocks
}
