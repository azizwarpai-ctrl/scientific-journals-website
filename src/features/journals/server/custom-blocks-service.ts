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
import { load } from "cheerio"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { CustomBlockSchema } from "@/src/features/journals/types/custom-block-types"
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
  const extractCleanBlocks = (arr: string[]): string[] => {
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

  // ── Phase 2: Fetch ALL block contents for this journal ──
  // Instead of guessing the OJS name-mangling (hyphens? suffixes?), 
  // we fetch all 'blockContent' rows and resolve them in memory.
  let contentRows: { plugin_name: string; setting_value: string | null }[] = []
  try {
    contentRows = await ojsQuery<{ plugin_name: string; setting_value: string | null }>(
      `SELECT plugin_name, setting_value
       FROM plugin_settings
       WHERE setting_name = 'blockContent'
         AND context_id = ?`,
      [journalId]
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
    const lowerName = name.toLowerCase()
    
    // Resolve content using flexible naming patterns
    // 1. Exact match (as seen in some OJS versions)
    // 2. Suffixed match (standard OJS: blocknamecustomblockplugin)
    // 3. Hyphen-stripped suffixed match (common sanitization)
    const rawContentStr = 
      contentMap.get(lowerName) || 
      contentMap.get(`${lowerName}customblockplugin`) || 
      contentMap.get(`${lowerName.replace(/[-_]/g, '')}customblockplugin`)
    
    if (!rawContentStr) {
      console.log(`[CustomBlocks] No content found for block "${name}" (tried ${lowerName}, ${lowerName}customblockplugin)`)
      continue
    }

    let contentToSanitize = rawContentStr
    const trimmedRaw = rawContentStr.trim()

    // Handle OJS 3.4+ Localized JSON storage `{"en_US": "<p>html</p>"}`
    if (trimmedRaw.startsWith("{") && trimmedRaw.endsWith("}")) {
      try {
        const parsedLocales = JSON.parse(trimmedRaw)
        if (typeof parsedLocales === 'object' && parsedLocales !== null) {
          // Robust locale resolution
          const p = _primaryLocale;
          const variants = [
            p,                           // en_US
            p.replace("_", "-"),         // en-US
            p.replace("-", "_"),         // en_US (redundant but safe)
            p.split(/[_-]/)[0],          // en
            'en_US',
            'en'
          ];
          
          let foundContent: string | null = null;
          for (const v of variants) {
            if (typeof parsedLocales[v] === 'string' && parsedLocales[v].trim().length > 0) {
              foundContent = parsedLocales[v];
              break;
            }
          }

          contentToSanitize = foundContent || Object.values(parsedLocales).find(v => typeof v === 'string') as string || '';
          if (typeof contentToSanitize !== 'string') continue;
        }
      } catch {
        // Not JSON, just standard flat HTML string fallback
      }
    }

    const cleanContent = sanitizeHtml(contentToSanitize, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRS,
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
    
    // Deconstruct block HTML to find inner items.
    //
    // OJS custom blocks can have several structures:
    //   A) <div class="content"><div>...item...</div><div>...item...</div></div>
    //   B) <ul><li>...item...</li></ul>
    //   C) Flat HTML with no wrapper structure (single item)
    //   D) Multiple top-level <p> or text elements (single item)
    //
    // Strategy: try progressively broader selectors, pick the first that
    // yields ≥2 child elements with meaningful content.
    const $ = load(cleanContent)
    const items: CustomBlock[] = []

    // Candidate selectors from most-specific to most-generic
    const CANDIDATE_SELECTORS = [
      ".content > div",          // OJS default block theme wrapper
      ".pkp_block > div",        // PKP sidebar block class
      "ul > li",                 // List-style blocks
      "body > div",              // Direct div children of body
      "div > div",               // Any nested divs (requires parent-consistency check)
    ]

    let bestElements: ReturnType<typeof $> | null = null

    for (const selector of CANDIDATE_SELECTORS) {
      const els = $(selector)
      // Only accept if we get ≥2 elements, each with non-trivial text
      const withContent = els.filter((_, el) => {
        const text = $(el).text().trim()
        return text.length > 20
      })
      if (withContent.length < 2) continue

      // For the generic "div > div" selector, require that all matched elements
      // share the same parent to avoid treating sub-structure (header + body of a
      // single block) as separate items.
      if (selector === "div > div") {
        const parents = new Set<unknown>()
        withContent.each((_, el) => parents.add(el.parent))
        if (parents.size > 1) continue
      }

      bestElements = withContent
      break
    }

    if (bestElements && bestElements.length >= 2) {
      bestElements.each((idx, el) => {
        const htmlContent = $(el).html() || ""
        if (!htmlContent.trim()) return

        const { title, image, link, description } = extractCardFields(htmlContent, `${name}-${idx}`)

        if (title && description && description !== title && description !== "No description available.") {
          const itemResult = CustomBlockSchema.safeParse({
            name: `${name}-${idx}`,
            content: htmlContent,
            title,
            image,
            link,
            description,
          })
          if (itemResult.success) {
            items.push(itemResult.data)
          }
        }
      })
    }

    if (items.length > 0) {
      blocks.push(...items)
    } else {
      // Fallback: treat the entire block as a single carousel item
      const cardFields = extractCardFields(cleanContent, name)
      blocks.push({
        name,
        content: cleanContent,
        ...cardFields,
      })
    }
  }

  console.log(`[CustomBlocks] journal_id=${journalId}: returning ${blocks.length} parsed block(s)`)
  return blocks
}

/**
 * Simple HTML entity decoder for common characters.
 * Prevents &amp;, &quot;, etc. from appearing in titles/descriptions.
 */
function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Extracts structured fields from sanitized HTML for the Journal Carousel.
 * Pure helper function for testability.
 */
export function extractCardFields(html: string, name: string) {
  // 1. Title: Look for headings, then strong tags, or fallback to block name
  const headingMatch = html.match(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/i)
  const strongMatch = html.match(/<strong>(.*?)<\/strong>/i)
  
  const rawTitleHtml = headingMatch ? headingMatch[0] : (strongMatch ? strongMatch[0] : '')
  const rawTitleText = (headingMatch ? headingMatch[1] : (strongMatch ? strongMatch[1] : name))
    .replace(/<[^>]+>/g, '')
    .trim()
  
  const title = decodeHtml(rawTitleText) || name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // 2. Image: First img tag source
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  const image = imgMatch ? imgMatch[1] : undefined

  // 3. Link: First a tag href
  const linkMatch = html.match(/<a[^>]+href=["']([^"']+)["']/i)
  const link = linkMatch ? linkMatch[1] : undefined

  // 4. Description: Remove title/image/link elements and get remaining text
  // To avoid Frankenstein strings (title merged into description text), explicitly erase the actual title tag from processing
  const contentWithoutTitle = rawTitleHtml ? html.replace(rawTitleHtml, '') : html;
  
  let descriptionRaw = contentWithoutTitle
    .replace(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<a[^>]*>.*?<\/a>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // If description is too short, try to use p tags as before but more broadly
  if (descriptionRaw.length < 10) {
    const allText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    descriptionRaw = allText.length > title.length ? allText : "View details to learn more."
  }

  const decodedDesc = decodeHtml(descriptionRaw)
  const description = decodedDesc.length > 300 
    ? decodedDesc.substring(0, 297) + "..."
    : decodedDesc

  return { title, image, link, description: description || 'No description available.' }
}
