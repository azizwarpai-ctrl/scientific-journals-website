/**
 * editorial-board-nav-service.ts
 *
 * Fetches editorial board member data from the OJS Navigation Menu Item
 * with path = 'editorial-board'.  Journals on this platform store their
 * editorial boards as hand-authored HTML inside a custom OJS page rather
 * than using the built-in user_user_groups masthead system.
 *
 * Database path:
 *   navigation_menu_items (path='editorial-board', context_id=journalId)
 *     → navigation_menu_item_settings (setting_name='content')
 *
 * The HTML is Word-pasted TinyMCE content containing Microsoft VML
 * conditional comments.  Pre-processing strips the VML and unwraps the
 * [if !vml] blocks so that actual <img> URLs become visible to the parser.
 *
 * Two observed HTML patterns (both handled):
 *
 *   Pattern A — Bootstrap wrapper + Word VML (jme / ojbr):
 *     <p><strong>ROLE_HEADING</strong></p>
 *     <p><img src="https://…/blobid14.png"></p>   ← real URL image
 *     <p><strong>Dr. Name Name</strong></p>
 *     <p>Affiliation text</p>
 *     <p><a href="https://orcid.org/…">…</a></p>
 *     (next member or next role heading)
 *
 *   Pattern B — Word paste, no images (ojmr simple):
 *     <p><strong>Dr. Name Name</strong></p>
 *     <p>Affiliation text</p>
 *     <div><hr></div>                              ← explicit separator
 *     (next member)
 *
 * Inline base64 `data:image/*` URIs are accepted (capped per image) because
 * OJS TinyMCE often embeds member portraits this way after Word pastes.
 * Without this the UI would silently fall back to initials avatars.
 */

import { load } from "cheerio"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum accepted size for an inline base64 image (≈ 400 KB). */
const MAX_DATA_URI_BYTES = 400_000

/**
 * Strict data-URI matcher: `data:<image-mime>;base64,<base64-payload>`.
 * Only common web image MIMEs are allowed, and the payload must be valid
 * base64 (A–Z, a–z, 0–9, +, /, with optional `=` padding). This rejects
 * URL-encoded `data:image/svg+xml` payloads (which can embed scripts) and
 * any malformed / non-base64 content.
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

const navCache = new Map<string, { data: EditorialBoardMember[] | null; ts: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000

// ── HTML pre-processing ────────────────────────────────────────────────────────

/**
 * Strips Microsoft Word / VML conditional comments from TinyMCE-pasted HTML.
 *
 * Before:  <!--[if gte vml 1]>…complex VML…<![endif]-->
 *          <!--[if !vml]--><img src="real.png"><!--[endif]-->
 *
 * After:   <img src="real.png">
 */
function stripWordVml(html: string): string {
  // Remove VML blocks entirely (keep nothing inside)
  let out = html.replace(/<!--\[if\s+gte\s+vml\s+\d+\]>[\s\S]*?<!\[endif\]-->/gi, "")
  // Unwrap [if !vml] blocks — keep the HTML content visible
  out = out.replace(/<!--\[if\s+!vml\]-->([\s\S]*?)<!--\[endif\]-->/gi, "$1")
  return out
}

// ── Text classification ────────────────────────────────────────────────────────

/** Returns true if `text` looks like a role/group heading, not a person's name. */
function isRoleHeading(text: string): boolean {
  const t = text.toLowerCase().trim()
  // Name prefix wins unconditionally
  if (NAME_PREFIXES.some((p) => t.startsWith(p))) return false
  // Role keyword present
  if (ROLE_KEYWORDS.some((k) => t.includes(k))) return true
  // All-caps short label (e.g. "EDITORIAL BOARD")
  if (t === t.toUpperCase() && t.replace(/\s/g, "").length > 3) return true
  return false
}

/** Returns true if `text` looks like a person's name. */
function isPersonName(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (NAME_PREFIXES.some((p) => t.startsWith(p))) return true
  // Multiple words, no role keywords — assume a name
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

/**
 * Parses the TinyMCE editorial board HTML into structured member records.
 * Exported for unit testing.
 */
export function parseEditorialBoardHtml(rawHtml: string): RawMember[] {
  const cleaned = stripWordVml(rawHtml)
  const $ = load(cleaned)

  const members: RawMember[] = []
  let currentRole = "Editorial Board Member"
  let pending: Partial<RawMember> | null = null

  /** Flush pending member into results if it has a name. */
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

  /**
   * Safe URL check for <img src>. Allows:
   *   - http / https remote URLs
   *   - data:image/<png|jpeg|jpg|gif|webp>;base64,<valid-base64> payloads
   *     whose total length is ≤ MAX_DATA_URI_BYTES
   * Rejects everything else (javascript:, file:, about:, blob:,
   * data:image/svg+xml, URL-encoded data URIs, non-base64 payloads, etc.)
   */
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

  // Visit every <p> and <hr> element in document order.
  // Using both selectors ensures we catch <hr> nested inside Word's
  // <div class="MsoNormal"> wrappers.
  $("p, hr").each((_, el) => {
    const tag = el.type === "tag" ? el.name : ""

    // ── HR: explicit member separator ──────────────────────────────────────
    if (tag === "hr") {
      flush()
      return
    }

    if (tag !== "p") return

    const $el = $(el)

    // ── Extract all <strong> text from this paragraph ─────────────────────
    let strongText = ""
    $el.find("strong").each((_, s) => {
      strongText += $(s).text() + " "
    })
    strongText = strongText.replace(/\s+/g, " ").trim()

    // ── Extract plain text ─────────────────────────────────────────────────
    const plainText = $el.text().replace(/\s+/g, " ").trim()

    // ── Extract first real image URL ───────────────────────────────────────
    let imgSrc: string | null = null
    $el.find("img").each((_, img) => {
      const src = safeUrl($(img).attr("src") ?? "")
      if (src) {
        imgSrc = src
        return false // stop after first valid image
      }
    })

    // ── Extract profile links (ORCID / Scholar / Scopus) ──────────────────
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

    // ── Image-only paragraph ───────────────────────────────────────────────
    if (imgSrc && !strongText) {
      if (!pending) pending = { role: currentRole }
      if (!pending.image) pending.image = imgSrc
      return
    }

    // ── Paragraph with <strong> text ──────────────────────────────────────
    if (strongText) {
      if (isRoleHeading(strongText) && strongText.length < 100) {
        // Role/group heading — start a new group
        flush()
        currentRole = strongText
        // Occasionally role headings embed an inline image (unusual but safe)
        if (imgSrc) {
          pending = { role: currentRole, image: imgSrc }
        }
        return
      }

      if (isPersonName(strongText)) {
        // New person — flush the previous if it already has a name
        if (pending?.name) flush()
        if (!pending) pending = { role: currentRole }
        pending.name = strongText
        if (imgSrc && !pending.image) pending.image = imgSrc
        return
      }

      // Ambiguous strong text — treat as affiliation if pending has no affiliation yet
      if (pending && !pending.affiliation && plainText.length > 5) {
        pending.affiliation = plainText
      }
      return
    }

    // ── Plain-text paragraph (affiliation candidate) ───────────────────────
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
 * Fetches the editorial board by reading the `editorial-board` navigation menu
 * item content for the given OJS journal.
 *
 * Returns:
 *   - `EditorialBoardMember[]`  — parsed members (may be empty)
 *   - `null`                    — nav page not found or has no content;
 *                                 caller should fall back to user_groups query
 */
export async function fetchEditorialBoardFromNavPage(
  ojsJournalId: string,
  primaryLocale = "en"
): Promise<EditorialBoardMember[] | null> {
  if (!/^\d+$/.test(ojsJournalId)) return null

  const cacheKey = `nav:${ojsJournalId}`
  const now = Date.now()
  const cached = navCache.get(cacheKey)
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.data

  const journalId = parseInt(ojsJournalId, 10)
  const localePrefix = primaryLocale.split(/[_-]/)[0]

  // ── Fetch nav page content ─────────────────────────────────────────────────
  let rows: { content: string | null; locale: string }[] = []
  try {
    rows = await ojsQuery<{ content: string | null; locale: string }>(
      `SELECT nmis.setting_value AS content, nmis.locale
       FROM navigation_menu_items nmi
       JOIN navigation_menu_item_settings nmis
         ON nmis.navigation_menu_item_id = nmi.navigation_menu_item_id
         AND nmis.setting_name = 'content'
       WHERE nmi.context_id = ?
         AND nmi.path = 'editorial-board'
       ORDER BY
         CASE
           WHEN nmis.locale = ?          THEN 0
           WHEN nmis.locale LIKE ?       THEN 1
           ELSE 2
         END ASC
       LIMIT 5`,
      [journalId, primaryLocale, `${localePrefix}%`]
    )
  } catch (err) {
    console.error(`[NavPage] DB query failed for journal ${journalId}:`, err)
    navCache.set(cacheKey, { data: null, ts: now })
    return null
  }

  // Find the first row with substantive content (> 100 chars to skip stub rows)
  const row = rows.find((r) => r.content && r.content.trim().length > 100)
  if (!row?.content) {
    console.log(`[NavPage] No editorial-board content for journal ${journalId}`)
    navCache.set(cacheKey, { data: null, ts: now })
    return null // signal: use DB fallback
  }

  // ── Parse HTML ─────────────────────────────────────────────────────────────
  const raw = parseEditorialBoardHtml(row.content)
  console.log(`[NavPage] journal_id=${journalId}: parsed ${raw.length} members from nav page`)

  const members: EditorialBoardMember[] = raw.map((m, idx) => ({
    // Negative IDs distinguish nav-page members from real OJS user IDs
    userId: -(idx + 1),
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

  navCache.set(cacheKey, { data: members, ts: now })
  return members
}

/**
 * Maps a free-text role label to an OJS role_id for UI styling purposes.
 * These IDs are used only for colour/badge selection, not for DB lookups.
 */
function deriveRoleId(role: string): number {
  const r = role.toLowerCase()
  if (r.includes("chief") || r.includes("principal")) return 17
  if (r.includes("section")) return 19
  if (r.includes("guest")) return 18
  if (r.includes("editor")) return 17
  return 0 // default → ROLE_STYLES.default
}
