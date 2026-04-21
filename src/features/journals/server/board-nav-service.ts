/**
 * board-nav-service.ts
 *
 * Fetches board member data (Editorial Board, Advisory Board, etc.) from OJS
 * Navigation Menu Items. Journals on this platform often store boards as
 * hand-authored HTML inside custom OJS pages rather than using the built-in
 * OJS masthead system.
 *
 * Database path:
 *   navigation_menu_items (path=targetPath, context_id=journalId)
 *     → navigation_menu_item_settings (setting_name='content')
 */

import { load } from "cheerio"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum accepted size for an inline base64 image (≈ 400 KB). */
const MAX_DATA_URI_BYTES = 400_000

/**
 * Strict data-URI matcher: `data:<image-mime>;base64,<base64-payload>`.
 */
const DATA_IMAGE_URI_RE =
  /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,(?:[A-Za-z0-9+/]+={0,2})$/

/** Lowercase keywords that identify a paragraph as a role/group heading. */
const ROLE_KEYWORDS = [
  "editor", "chief", "board", "associate", "section", "guest",
  "managing", "deputy", "assistant", "co-editor", "honorary",
  "emeritus", "advisory", "reviewer", "committee",
  // Arabic
  "محرر", "رئيس", "هيئة", "لجنة", "مشرف",
]

/** Prefixes that identify a paragraph as a person's name (overrides role check). */
const NAME_PREFIXES = [
  "dr.", "prof.", "professor", "mr.", "ms.", "mrs.",
  "assoc.", "ass.", "أ.", "د.", "أ.د.", "م.",
]

// ── In-memory cache ────────────────────────────────────────────────────────────

const boardCache = new Map<string, { data: EditorialBoardMember[] | null; ts: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000

// ── HTML pre-processing ────────────────────────────────────────────────────────

function stripWordVml(html: string): string {
  let out = html.replace(/<!--\[if\s+gte\s+vml\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, "")
  out = out.replace(/<!--\[if\s+!vml\]-->([\s\S]*?)<!--\[endif\]-->/gi, "$1")
  return out
}

// ── Text classification ────────────────────────────────────────────────────────

function isRoleHeading(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (NAME_PREFIXES.some((p) => t.startsWith(p))) return false
  if (ROLE_KEYWORDS.some((k) => t.includes(k))) return true
  if (t === t.toUpperCase() && t.replace(/\s/g, "").length > 3) return true
  return false
}

function isPersonName(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (NAME_PREFIXES.some((p) => t.startsWith(p))) return true
  const words = text.trim().split(/\s+/)
  if (words.length >= 2 && !ROLE_KEYWORDS.some((k) => t.includes(k))) return true
  return false
}

// ── Parsed member ──────────────────────────────────────────────────────────────

interface RawMember {
  name: string
  role: string
  affiliation: string | null
  image: string | null
  orcid: string | null
  googleScholar: string | null
  scopus: string | null
}

// ── HTML parser ────────────────────────────────────────────────────────────────

export function parseBoardHtml(rawHtml: string, defaultRole = "Member"): RawMember[] {
  const cleaned = stripWordVml(rawHtml)
  const $ = load(cleaned)

  const members: RawMember[] = []
  let currentRole = defaultRole
  let pending: Partial<RawMember> | null = null

  const flush = () => {
    if (pending?.name?.trim()) {
      members.push({
        name: pending.name.trim(),
        role: (pending.role ?? currentRole).trim(),
        affiliation: pending.affiliation?.trim() ?? null,
        image: pending.image ?? null,
        orcid: pending.orcid ?? null,
        googleScholar: pending.googleScholar ?? null,
        scopus: pending.scopus ?? null,
      })
    }
    pending = null
  }

  const safeUrl = (src: string): string | null => {
    const s = src.trim()
    if (!s) return null
    if (s.startsWith("https://") || s.startsWith("http://")) return s
    if (
      s.startsWith("data:image/") &&
      s.length <= MAX_DATA_URI_BYTES &&
      DATA_IMAGE_URI_RE.test(s)
    ) {
      return s
    }
    return null
  }

  $("p, hr, div, figure, td, th").each((_, el) => {
    const tag = el.type === "tag" ? el.name : ""

    if (tag === "hr") {
      flush()
      return
    }

    if (tag !== "p") {
      const $el = $(el)
      if ($el.find("p").length > 0) return

      let imgSrc: string | null = null
      $el.find("img").each((_, img) => {
        const src = safeUrl($(img).attr("src") ?? "")
        if (src) {
          imgSrc = src
          return false
        }
      })

      if (imgSrc) {
        if (!pending) pending = { role: currentRole }
        if (!pending.image) pending.image = imgSrc
      }

      $el.find("a[href]").each((_, a) => {
        const href = ($(a).attr("href") ?? "").trim()
        if (!href) return
        if (!pending) pending = { role: currentRole }
        if (href.includes("orcid.org/") && !pending.orcid) {
          const m = href.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i)
          if (m) pending.orcid = m[1]
        } else if (href.includes("scholar.google.") && !pending.googleScholar) {
          pending.googleScholar = href
        } else if (href.includes("scopus.com/") && !pending.scopus) {
          pending.scopus = href
        }
      })
      return
    }

    const $el = $(el)
    let strongText = ""
    $el.find("strong").each((_, s) => {
      strongText += $(s).text() + " "
    })
    strongText = strongText.replace(/\s+/g, " ").trim()
    const plainText = $el.text().replace(/\s+/g, " ").trim()

    let imgSrc: string | null = null
    $el.find("img").each((_, img) => {
      const src = safeUrl($(img).attr("src") ?? "")
      if (src) {
        imgSrc = src
        return false
      }
    })

    $el.find("a[href]").each((_, a) => {
      const href = ($(a).attr("href") ?? "").trim()
      if (!href) return
      if (!pending) pending = { role: currentRole }
      if (href.includes("orcid.org/") && !pending.orcid) {
        const m = href.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i)
        if (m) pending.orcid = m[1]
      } else if (href.includes("scholar.google.") && !pending.googleScholar) {
        pending.googleScholar = href
      } else if (href.includes("scopus.com/") && !pending.scopus) {
        pending.scopus = href
      }
    })

    if (imgSrc && !strongText) {
      if (!pending) pending = { role: currentRole }
      if (!pending.image) pending.image = imgSrc
      return
    }

    if (strongText) {
      if (isRoleHeading(strongText) && strongText.length < 100) {
        flush()
        currentRole = strongText
        if (imgSrc) pending = { role: currentRole, image: imgSrc }
        return
      }
      if (isPersonName(strongText)) {
        if (pending?.name) flush()
        if (!pending) pending = { role: currentRole }
        pending.name = strongText
        if (imgSrc && !pending.image) pending.image = imgSrc
        return
      }
      if (pending && !pending.affiliation && plainText.length > 5) {
        pending.affiliation = plainText
      }
      return
    }

    if (plainText && !/^[\s\u00a0]*$/.test(plainText) && plainText.length > 4) {
      if (pending && !pending.affiliation) {
        pending.affiliation = plainText
      }
    }
  })

  flush()
  return members
}

// ── DB query + orchestration ───────────────────────────────────────────────────

/**
 * Fetches board members from a specific OJS navigation menu path.
 */
export async function fetchBoardFromNavPage(
  ojsJournalId: string,
  path: string,
  primaryLocale = "en"
): Promise<EditorialBoardMember[] | null> {
  if (!/^\d+$/.test(ojsJournalId)) return null

  const cacheKey = `nav:${ojsJournalId}:${path}`
  const now = Date.now()
  const cached = boardCache.get(cacheKey)
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.data

  const journalId = parseInt(ojsJournalId, 10)
  const localePrefix = primaryLocale.split(/[_-]/)[0]

  let rows: { content: string | null; locale: string }[] = []
  try {
    rows = await ojsQuery<{ content: string | null; locale: string }>(
      `SELECT nmis.setting_value AS content, nmis.locale
       FROM navigation_menu_items nmi
       JOIN navigation_menu_item_settings nmis
         ON nmis.navigation_menu_item_id = nmi.navigation_menu_item_id
         AND nmis.setting_name = 'content'
       WHERE nmi.context_id = ?
         AND nmi.path = ?
       ORDER BY
         CASE
           WHEN nmis.locale = ?          THEN 0
           WHEN nmis.locale LIKE ?       THEN 1
           ELSE 2
         END ASC
       LIMIT 5`,
      [journalId, path, primaryLocale, `${localePrefix}%`]
    )
  } catch (err) {
    console.error(`[NavPage] DB query failed for journal ${journalId} (path=${path}):`, err)
    boardCache.set(cacheKey, { data: null, ts: now })
    return null
  }

  const row = rows.find((r) => r.content && r.content.trim().length > 100)
  if (!row?.content) {
    console.log(`[NavPage] No content for journal ${journalId} at path '${path}'`)
    boardCache.set(cacheKey, { data: null, ts: now })
    return null
  }

  const defaultRole = path === "advisory-board" ? "Advisory Board Member" : "Editorial Board Member"
  const raw = parseBoardHtml(row.content, defaultRole)
  console.log(`[NavPage] journal_id=${journalId} path=${path}: parsed ${raw.length} members`)

  const members: EditorialBoardMember[] = raw.map((m, idx) => ({
    userId: -(idx + 1 + (path === "advisory-board" ? 1000 : 0)), // Ensure semi-unique negative IDs
    name: m.name,
    role: m.role,
    affiliation: m.affiliation,
    roleId: deriveRoleId(m.role),
    orcid: m.orcid,
    url: null,
    profileImage: m.image,
    googleScholar: m.googleScholar,
    scopus: m.scopus,
  }))

  boardCache.set(cacheKey, { data: members, ts: now })
  return members
}

function deriveRoleId(role: string): number {
  const r = role.toLowerCase()
  if (r.includes("chief") || r.includes("principal")) return 17
  if (r.includes("section")) return 19
  if (r.includes("guest")) return 18
  if (r.includes("editor")) return 17
  return 0
}
