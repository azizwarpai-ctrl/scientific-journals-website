/**
 * Custom Blocks Service
 *
 * Fetches sidebar blocks managed by the OJS Custom Block Manager plugin
 * directly from the OJS MySQL database.
 *
 * OJS 3.4+ Schema (plugin_settings table):
 *   Columns: plugin_setting_id, plugin_name, context_id, setting_name, setting_value, setting_type
 *   ⚠ NO `locale` column — content is unlocalized at the plugin_settings level.
 *
 *   Manager plugin entry:
 *   plugin_name = 'customblockmanagerplugin'
 *   setting_name = 'blocks'
 *   setting_value = JSON array of block machine-names, e.g. ["myblock","infoblock"]
 *
 *   Per-block content entry:
 *   plugin_name = '{blockName}customblockplugin'
 *   setting_name = 'blockContent'
 *   setting_value = HTML string
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

export async function fetchCustomBlocks(
  ojsJournalId: string,
  _primaryLocale: string
): Promise<CustomBlock[]> {
  if (!/^\d+$/.test(ojsJournalId)) {
    console.error("[CustomBlocks] Invalid OJS journal ID:", ojsJournalId)
    return []
  }

  const journalId = parseInt(ojsJournalId, 10)
  let managerRows: PluginBlockRow[] = []

  // ── Phase 1: Get list of block names ──
  try {
    // Note: Do NOT use `locale` here, as OJS 3.4+ removed it from plugin_settings
    managerRows = await ojsQuery<PluginBlockRow>(
      `SELECT setting_value
       FROM plugin_settings
       WHERE plugin_name = 'customblockmanagerplugin'
         AND setting_name = 'blocks'
         AND context_id = ?
       LIMIT 1`,
      [journalId]
    )
  } catch (dbError) {
    console.warn(`[CustomBlocks] Failed to query customblockmanagerplugin for journal_id=${journalId} (likely missing plugin_settings table or unsupported schema). Returning empty array.`, dbError)
    return []
  }

  if (!managerRows || managerRows.length === 0 || !managerRows[0].setting_value) {
    console.log(`[CustomBlocks] No custom blocks configured for journal_id=${journalId}`)
    return []
  }

  const rawValue = managerRows[0].setting_value
  let blockNames: string[] = []

  // Function to extract clean block names based on OJS requirements
  const extractCleanBlocks = (arr: any[]): string[] => {
    const raw = arr
      .filter((n): n is string => typeof n === "string")
      .map(n => n.trim())
      .filter(n => n.length > 0 && /^[a-zA-Z0-9_-]+$/.test(n));
    return Array.from(new Set(raw));
  }

  try {
    // Try Standard JSON
    const parsed = JSON.parse(rawValue)
    if (Array.isArray(parsed)) {
      blockNames = extractCleanBlocks(parsed)
    } else if (typeof parsed === 'object' && parsed !== null) {
      blockNames = extractCleanBlocks(Object.values(parsed))
    }
  } catch {
    // Fallback: Handle OJS's classic PHP serialization format for arrays/objects
    if (rawValue.includes('a:')) {
      // Regex correctly grabs PHP serialized strings matching OJS block names
      const matches = Array.from(rawValue.matchAll(/s:\d+:"([a-zA-Z0-9_-]+)"/g))
      if (matches && matches.length > 0) {
        blockNames = extractCleanBlocks(matches.map(m => m[1]))
      }
    }
  }

  if (blockNames.length === 0) {
    console.warn(`[CustomBlocks] Failed to extract any valid blocks from setting value for journal_id=${journalId}:`, rawValue)
    return []
  }

  console.log(`[CustomBlocks] journal_id=${journalId}: found ${blockNames.length} valid block(s): ${blockNames.join(", ")}`)

  // ── Phase 2: Fetch content for each block ──
  const pluginNames = blockNames.map((n) => `${n.toLowerCase()}customblockplugin`)
  let contentRows: { plugin_name: string; setting_value: string | null }[] = []

  try {
    contentRows = await ojsQuery<{ plugin_name: string; setting_value: string | null }>(
      `SELECT plugin_name, setting_value
       FROM plugin_settings
       WHERE plugin_name IN (?)
         AND setting_name = 'blockContent'
         AND context_id = ?`,
      [pluginNames, journalId]
    )
  } catch (dbError) {
    console.warn(`[CustomBlocks] Failed to fetch block contents for journal_id=${journalId}. Returning empty array.`, dbError)
    return []
  }

  const contentMap = new Map<string, string>()
  for (const row of contentRows) {
    if (!row.setting_value) continue
    contentMap.set(row.plugin_name.toLowerCase(), row.setting_value)
  }

  // ── Phase 3: Map to domain objects, sanitize HTML ──
  const blocks: CustomBlock[] = []

  for (const name of blockNames) {
    const pluginName = `${name.toLowerCase()}customblockplugin`
    const rawContentStr = contentMap.get(pluginName)

    if (!rawContentStr) continue

    let contentToSanitize = rawContentStr
    const trimmedRaw = rawContentStr.trim()

    // Handle OJS 3.4+ Localized JSON storage `{"en_US": "<p>html</p>"}`
    if (trimmedRaw.startsWith("{") && trimmedRaw.endsWith("}")) {
      try {
        const parsedLocales = JSON.parse(trimmedRaw)
        if (typeof parsedLocales === 'object' && parsedLocales !== null) { // It's an object of locales
           // Fallback priority: exact locale -> en_US -> en -> any first fallback
           contentToSanitize = parsedLocales[_primaryLocale] || parsedLocales['en_US'] || parsedLocales['en'] || Object.values(parsedLocales)[0] || '';
           if (typeof contentToSanitize !== 'string') continue;
        }
      } catch (e) {
        // Not JSON, just standard flat HTML string fallback
      }
    }

    const cleanContent = sanitizeHtml(contentToSanitize, {
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

  console.log(`[CustomBlocks] journal_id=${journalId}: returning ${blocks.length} parsed block(s)`)
  return blocks
}
