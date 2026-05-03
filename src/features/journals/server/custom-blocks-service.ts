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
import type { CheerioAPI, Cheerio } from "cheerio"
import type { AnyNode } from "domhandler"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { CustomBlockSchema } from "@/src/features/journals/types/custom-block-types"
import type { CustomBlock } from "@/src/features/journals/types/custom-block-types"

// Headings that signal a block-level title (e.g. "Journal Information").
// Stripped from the root before card splitting so the outer label doesn't
// collapse multiple cards into one.
const BLOCK_TITLE_PATTERNS = [
  /^journal\s+information$/i,
  /^journal\s+info$/i,
  /^information$/i,
  /^side\s*menu$/i,
  /^highlights?$/i,
  /^links?$/i,
  /^about\s+(the\s+)?journal$/i,
]

/**
 * Pre-process Word/VML HTML to extract <img> fallbacks from IE conditional
 * comments before sanitize-html strips all HTML comments.
 *
 * Word pastes images as VML inside <!--[if gte vml 1]>...<![endif]--> with
 * <img data:URI> fallbacks inside <!--[if !vml]-->...<![endif]-->.
 * htmlparser2 (used by sanitize-html) strips all comment nodes, so both
 * blocks vanish. We promote the fallback <img> tags before sanitization.
 */
function extractVmlFallbackImgs(html: string): string {
  // Promote <img> fallbacks from <!--[if !vml]-->...<![endif]--> blocks
  let result = html.replace(
    /<!--\[if !vml\]-->([\s\S]*?)<!--\[endif\]-->/gi,
    (_, inner) => inner.trim()
  )
  // Remove VML blocks (non-standard <!--[if gte vml N]>...<![endif]-->) to
  // prevent stray text leaking into the sanitized output.
  result = result.replace(
    /<!--\[if gte vml \d+\]>[\s\S]*?<!\[endif\]-->/gi,
    ""
  )
  return result
}

// Permitted HTML tags in custom block content (generous but safe)
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u",
  "ul", "ol", "li",
  "h2", "h3", "h4", "h5", "h6",
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

    const cleanContent = sanitizeHtml(extractVmlFallbackImgs(contentToSanitize), {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRS,
      allowedSchemesByTag: { img: ["http", "https", "data"] },
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
    
    // ── Deconstruct block HTML into one card per inner item ──────────────
    // Strategies, evaluated in order by `splitBlockIntoCards`:
    //   1. Strip the outer block-title heading (e.g. "Journal Information")
    //      so it doesn't glue the first card to the block label.
    //   2. Split on <hr> boundaries.
    //   3. Recursively find the DOM level where ≥2 sibling containers each
    //      hold a card marker (heading / <strong> / <img>).
    //   4. Split flat content using <img> elements as anchors (1 per card).
    //   5. Split flat content using <strong>/heading elements as anchors.
    //   6. Fall back to the whole HTML as a single card.
    const cardHtmlSegments = splitBlockIntoCards(cleanContent)
    const items: CustomBlock[] = []

    if (cardHtmlSegments.length >= 2) {
      // Second-pass: some segments may themselves contain multiple logical
      // "card title" anchors when an editor merged items under a single
      // wrapper <div> in OJS. Re-split each segment at those anchors.
      const refinedSegments = cardHtmlSegments.flatMap(subSplitSegmentByTitleAnchors)
      for (let idx = 0; idx < refinedSegments.length; idx++) {
        const segHtml = refinedSegments[idx]
        const { image, link, description } = extractCardFields(segHtml, `${name}-${idx}`)
        const finalTitle = getFinalTitle(segHtml, name, idx)
        const finalDescription = buildFinalDescription(finalTitle, description)
        const itemResult = CustomBlockSchema.safeParse({
          name: `${name}-${idx}`,
          content: segHtml,
          title: finalTitle,
          image,
          link,
          description: finalDescription,
        })
        if (itemResult.success) items.push(itemResult.data)
      }
    }

    if (items.length > 0) {
      blocks.push(...items)
    } else {
      // Single-card fallback — strip the block-title heading first so the
      // first real item doesn't inherit "Journal Information" as its title.
      // Then apply sub-split in case the single "card" is actually merged items.
      const strippedHtml = stripBlockTitleHeading(cleanContent)
      const singleSegments = subSplitSegmentByTitleAnchors(strippedHtml || cleanContent)
      for (let idx = 0; idx < singleSegments.length; idx++) {
        const segHtml = singleSegments[idx]
        const cardFields = extractCardFields(segHtml, name)
        const finalTitle = getFinalTitle(segHtml, name, singleSegments.length > 1 ? idx : undefined)
        const finalDescription = buildFinalDescription(
          finalTitle,
          cardFields.description
        )
        const itemResult = CustomBlockSchema.safeParse({
          name: singleSegments.length > 1 ? `${name}-${idx}` : name,
          content: cleanContent,
          title: finalTitle,
          image: cardFields.image,
          link: cardFields.link,
          description: finalDescription,
        })
        if (itemResult.success) {
          items.push(itemResult.data)
        }
      }
      blocks.push(...items)
    }
  }

  console.log(`[CustomBlocks] journal_id=${journalId}: returning ${blocks.length} parsed block(s)`)
  return blocks
}
/**
 * Normalises a description: if it duplicates the title or is a placeholder,
 * return a generic fallback. Used by all parsing strategies.
 */
function buildFinalDescription(title: string, description: string): string {
  if (
    !description ||
    description === title ||
    description === "No description available."
  ) {
    return "View details to learn more."
  }
  return description
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
 * Returns title: undefined if no heading/strong is found (caller may skip such cards).
 */
export function extractCardFields(html: string, _name: string) {
  // 1. Title: Look for headings, then strong tags. Return undefined if not found.
  const headingMatch = html.match(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/i)
  const strongMatch = html.match(/<strong>(.*?)<\/strong>/i)

  const rawTitleHtml = headingMatch ? headingMatch[0] : (strongMatch ? strongMatch[0] : null)
  const rawTitleText = (headingMatch ? headingMatch[1] : (strongMatch ? strongMatch[1] : null))
    ?.replace(/<[^>]+>/g, '')
    .trim()

  const title = rawTitleText ? decodeHtml(rawTitleText) : undefined

  // 2. Image: First img tag source (skip data: URIs to avoid embedding large base64 payloads)
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  const image = imgMatch && !imgMatch[1].startsWith("data:") ? imgMatch[1] : undefined

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
    const allText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    const titleLen = title?.length ?? 0
    descriptionRaw = allText.length > titleLen ? allText : "View details to learn more."
  }

  const decodedDesc = decodeHtml(descriptionRaw)
  const description = decodedDesc.length > 300
    ? decodedDesc.substring(0, 297) + "..."
    : decodedDesc

  return { title, image, link, description: description || 'No description available.' }
}

// ── Card splitter ───────────────────────────────────────────────────────────

type CheerioEl = AnyNode

function hasRenderableText(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").trim().length > 0
}

function tagOf(node: CheerioEl): string {
  return (node as unknown as { tagName?: string }).tagName?.toLowerCase() ?? ""
}

/**
 * Strip the outer block-title heading (e.g. `<h3>Journal Information</h3>`)
 * from the top of the block HTML. OJS's Custom Block Manager frequently
 * prefixes the entire block with one heading that labels the whole sidebar
 * card group, which must not be treated as the first card's title.
 *
 * Only strips the FIRST top-level heading (h2-h6) and only if its text matches
 * a known block-label pattern OR it's the sole heading at the root level.
 */
export function stripBlockTitleHeading(html: string): string {
  const $ = load(html)
  const bodyEl = ($("body").length ? $("body") : $.root()) as Cheerio<AnyNode>
  const rootHeadings = bodyEl.children("h2, h3, h4, h5, h6")
  if (rootHeadings.length === 0) return html

  const first = rootHeadings.first()
  const text = first.text().trim()
  const matchesLabel = BLOCK_TITLE_PATTERNS.some((re) => re.test(text))

  // Strip if it looks like a block label OR it's the only top-level heading
  // and there is at least one other "card-start" signal below it (strong/img/heading).
  const hasCardSignalsBelow =
    bodyEl.find("h2, h3, h4, h5, h6, strong, img").length > 1

  if (matchesLabel || (rootHeadings.length === 1 && hasCardSignalsBelow)) {
    first.remove()
    return bodyEl.html() ?? html
  }
  return html
}

/**
 * Split a block's sanitized HTML into one HTML segment per card. Returns
 * [] if no repeating pattern can be detected (caller falls back to single-card).
 */
export function splitBlockIntoCards(html: string): string[] {
  const withoutTitle = stripBlockTitleHeading(html)

  // 1. <hr> boundaries (DOM-based to preserve nested HTML structure)
  const $hr = load(withoutTitle)
  const bodyElHr = ($hr("body").length ? $hr("body") : $hr.root()) as Cheerio<AnyNode>
  const hrChildren = bodyElHr
    .children()
    .toArray()
    .filter((c) => (c as unknown as { type?: string }).type === "tag")

  const hrSegments: string[] = []
  let currentSegment: AnyNode[] = []
  for (const child of hrChildren) {
    if (tagOf(child) === "hr") {
      if (currentSegment.length > 0) {
        const seg = currentSegment.map((el) => $hr.html(el) ?? "").join("")
        if (hasRenderableText(seg)) hrSegments.push(seg)
        currentSegment = []
      }
    } else {
      currentSegment.push(child)
    }
  }
  if (currentSegment.length > 0) {
    const seg = currentSegment.map((el) => $hr.html(el) ?? "").join("")
    if (hasRenderableText(seg)) hrSegments.push(seg)
  }
  if (hrSegments.length >= 2) return hrSegments

  const $ = load(withoutTitle)
  const bodyEl = ($("body").length ? $("body") : $.root()) as Cheerio<AnyNode>

  // 2. Recursive repeating-container detection
  const repeating = findRepeatingContainer($, bodyEl)
  if (repeating && repeating.length >= 2) {
    const htmls = repeating
      .map((el) => $.html(el))
      .filter(hasRenderableText)
    if (htmls.length >= 2) return htmls
  }

  // 3. Image-anchored splitting (reliable when each card has an image)
  const imgCount = $("img").length
  const anchorCount = $("h2, h3, h4, h5, h6, strong").length
  if (imgCount >= 2 && anchorCount <= imgCount) {
    const imgSegs = splitFlatByPredicate($, bodyEl, (el) => tagOf(el) === "img" || $(el).find("img").length > 0)
    if (imgSegs.length >= 2) return imgSegs
  }

  // 4. Heading/strong-anchored splitting (flat document order)
  if (anchorCount >= 2) {
    const headingSegs = splitFlatByPredicate($, bodyEl, (el) => {
      const tag = tagOf(el)
      if (/^h[2-6]$/.test(tag)) return true
      if (tag === "strong") return true
      // A <p>/<div> that starts with a <strong> child whose text equals the
      // element's text is a title paragraph — treat as anchor.
      if (tag === "p" || tag === "div") {
        const $el = $(el)
        const inner = $el.children("strong").first()
        if (inner.length > 0 && $el.text().trim() === inner.text().trim()) return true
      }
      return false
    })
    if (headingSegs.length >= 2) return headingSegs
  }

  return []
}

/**
 * Walk the DOM looking for the shallowest parent whose direct children include
 * ≥2 element nodes that each look like a card (contains a heading/strong
 * title AND/OR an <img>). Returns the list of matching child elements, or
 * null if no level qualifies. Stops descending once a match is found.
 */
function findRepeatingContainer(
  $: CheerioAPI,
  root: Cheerio<AnyNode>,
): AnyNode[] | null {
  const looksLikeCard = (node: AnyNode): boolean => {
    const $n = $(node)
    const hasTitle =
      $n.find("h2, h3, h4, h5, h6").length > 0 || $n.find("strong").length > 0
    const hasImg = $n.find("img").length > 0
    return (hasTitle && $n.text().trim().length > 0) || hasImg
  }

  let found: AnyNode[] | null = null

  const visit = (node: AnyNode): boolean => {
    // If we already found a match at a shallower level, stop descending
    if (found) return true

    const $node = $(node)
    const children = $node
      .children()
      .toArray()
      .filter((c) => (c as unknown as { type?: string }).type === "tag")
    if (children.length >= 2) {
      const cardLike = children.filter(looksLikeCard)
      // Require at least 2/3 of siblings to look like cards to avoid
      // matching navigation nodes. Record this level and stop descending.
      if (cardLike.length >= 2 && cardLike.length * 3 >= children.length * 2) {
        found = cardLike
        return true // Stop visiting children
      }
    }
    // Try children; stop if any returns true
    for (const c of children) {
      if (visit(c)) return true
    }
    return false
  }

  visit(root[0] as AnyNode)
  return found
}

/**
 * Split the DIRECT children of `root` (in document order) at every node that
 * satisfies `isAnchor`. Each anchor begins a new segment; previous content
 * above the first anchor is dropped.
 */
function splitFlatByPredicate(
  $: CheerioAPI,
  root: Cheerio<AnyNode>,
  isAnchor: (el: AnyNode) => boolean,
): string[] {
  const children = root
    .children()
    .toArray()
    .filter((c) => (c as unknown as { type?: string }).type === "tag")

  const segments: string[] = []
  let current: string[] = []
  let started = false

  for (const child of children) {
    if (isAnchor(child)) {
      if (started && current.length > 0) {
        segments.push(current.join(""))
      }
      current = [$.html(child) ?? ""]
      started = true
    } else if (started) {
      current.push($.html(child) ?? "")
    }
  }
  if (started && current.length > 0) segments.push(current.join(""))

  return segments.filter(hasRenderableText)
}

// ── Title-anchor qualification ──────────────────────────────────────────────
// A genuine card title is a heading (h2-h6) OR a <strong> whose wrapping
// element contains no other text besides the strong itself — i.e. it's a
// standalone label, not an inline bold inside a sentence like
// `Online ISSN: <strong>2966-6864</strong>`.

function isQualifyingTitleAnchor($: CheerioAPI, el: AnyNode): boolean {
  const tag = tagOf(el)
  if (/^h[2-6]$/.test(tag)) return true
  if (tag !== "strong") return false

  const $el = $(el)
  const strongText = $el.text().trim()
  if (!strongText) return false

  const parent = $el.parent()
  if (parent.length === 0) return false
  const parentTag = tagOf(parent[0] as AnyNode)
  if (!["p", "div", "span", "h2", "h3", "h4", "h5", "h6"].includes(parentTag)) {
    return false
  }
  // Standalone means the parent's visible text equals the strong's text
  // (no surrounding copy), and the parent has no peer content like images
  // that would make it a mixed card body.
  if (parent.text().trim() !== strongText) return false
  return true
}

/**
 * Check whether `el` (or any descendant) contains a qualifying title anchor.
 * Used to treat a sibling subtree as a "card start marker" during sub-split.
 */
function subtreeHasTitleAnchor($: CheerioAPI, el: AnyNode): boolean {
  if (isQualifyingTitleAnchor($, el)) return true
  const $el = $(el)
  let found = false
  $el.find("strong, h2, h3, h4, h5, h6").each((_, node) => {
    if (isQualifyingTitleAnchor($, node as AnyNode)) {
      found = true
      return false
    }
  })
  return found
}

/**
 * Second-pass splitter. When an editor authored multiple logical cards
 * inside a single wrapper <div> (multiple standalone <strong> labels under
 * one container), slice that wrapper at each qualifying title anchor so each
 * logical item becomes its own card. If no merged structure is detected,
 * returns `[segmentHtml]` unchanged.
 */
export function subSplitSegmentByTitleAnchors(segmentHtml: string): string[] {
  const $ = load(segmentHtml)
  const bodyEl = ($("body").length ? $("body") : $.root()) as Cheerio<AnyNode>

  // Walk the DOM to find the shallowest container whose direct children
  // include ≥ 2 subtrees each holding a qualifying title anchor.
  let targetRoot: Cheerio<AnyNode> | null = null

  const visit = (node: AnyNode): boolean => {
    if (targetRoot) return true
    const $node = $(node)
    const kids = $node
      .children()
      .toArray()
      .filter((c) => (c as unknown as { type?: string }).type === "tag")
    if (kids.length >= 2) {
      const anchorKids = kids.filter((c) => subtreeHasTitleAnchor($, c))
      if (anchorKids.length >= 2) {
        targetRoot = $node
        return true
      }
    }
    for (const c of kids) {
      if (visit(c)) return true
    }
    return false
  }

  visit(bodyEl[0] as AnyNode)
  if (!targetRoot) return [segmentHtml]

  const subSegments = splitFlatByPredicate($, targetRoot, (el) =>
    subtreeHasTitleAnchor($, el),
  )

  return subSegments.length >= 2 ? subSegments : [segmentHtml]
}

/**
 * Fallback title helper — grab the alt text of the first <img> so a card
 * with no heading/<strong> anchor still renders with a meaningful label.
 */
export function extractImgAlt(html: string): string | undefined {
  const m = html.match(/<img[^>]*\balt=["']([^"']+)["']/i)
  if (!m) return undefined
  const alt = decodeHtml(m[1]).trim()
  return alt.length > 0 ? alt : undefined
}

/**
 * Compute the final card title using a fallback chain:
 * 1. Extracted title from heading/<strong>
 * 2. Image alt attribute
 * 3. Block-derived label (e.g. "Journal Information 1")
 */
function getFinalTitle(
  segmentHtml: string,
  baseName: string,
  idx?: number,
): string {
  const { title } = extractCardFields(segmentHtml, `${baseName}-${idx ?? 0}`)
  return (
    title ||
    extractImgAlt(segmentHtml) ||
    `${baseName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}${
      idx !== undefined ? ` ${idx + 1}` : ""
    }`
  )
}
