/**
 * Journal Policies Service
 *
 * Emits a strictly-filtered, fixed-order set of policy tabs from OJS.
 *
 * Data is discovered across multiple OJS sources:
 *   1. Navigation menu system — the "Journal Policies" custom menu
 *   2. Standalone navigation_menu_items with content
 *   3. journal_settings — standard policy fields
 *   4. static_pages — plugin-managed content pages
 *
 * Every candidate is matched against an APPROVED_POLICIES whitelist by
 * normalized title / slug / path. Only matching candidates are emitted, and
 * the resulting tabs are returned in the canonical order defined below.
 *
 * Required tabs (exact order, nothing else):
 *   1. Privacy Statement
 *   2. Policies on Ethics
 *   3. Copyright & Licensing Policies
 *   4. Editorial Workflow
 *   5. Indexing & Archiving
 *   6. DOIs & ORCID
 */

import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

// ── Public types ────────────────────────────────────────────────────────────

export interface PolicyTab {
  title: string
  slug: string
  content: string
}

export interface JournalPolicies {
  tabs: PolicyTab[]
  /** Whether DOI registration is enabled for this journal */
  doiEnabled: boolean
  /** Whether authors are required to declare competing interests */
  requireAuthorCompetingInterestsEnabled: boolean
}

// ── Internal row types ──────────────────────────────────────────────────────

interface SettingRow {
  setting_name: string
  setting_value: string | null
  locale: string
}

interface MenuRow {
  navigation_menu_item_id: number
  slug: string
  type: string
  seq: number
  setting_name: string
  setting_value: string | null
  locale: string
}

interface StaticPageRow {
  static_page_id: number
  path: string
  setting_name: string
  setting_value: string | null
  locale: string
}

interface StandaloneNavRow {
  navigation_menu_item_id: number
  path: string
  type: string
  setting_name: string
  setting_value: string | null
  locale: string
}

// ── Approved policy whitelist ───────────────────────────────────────────────
//
// The ONLY tabs that may appear in the Policies section. Each entry lists the
// aliases (normalized) that may appear in OJS as a title, slug, path, or
// journal_settings key. Matching is deliberately permissive so different OJS
// deployments can use their own wording, but nothing outside this list is
// ever emitted.

interface ApprovedPolicy {
  /** Canonical tab title shown to end-users */
  title: string
  /** Canonical slug used for tab identity */
  slug: string
  /** Aliases matched against normalized title/slug/path (OJS side) */
  aliases: string[]
  /** journal_settings keys whose value is the policy HTML */
  settingNames: string[]
  /**
   * OJS built-in navigation_menu_item types that identify this policy. These
   * point content at journal_settings rather than carrying their own HTML.
   */
  builtinTypes: string[]
}

const APPROVED_POLICIES: ApprovedPolicy[] = [
  {
    title: "Privacy Statement",
    slug: "privacy-statement",
    aliases: [
      "privacy statement",
      "privacy",
      "privacy policy",
    ],
    settingNames: ["privacyStatement"],
    builtinTypes: ["NMI_TYPE_PRIVACY"],
  },
  {
    title: "Policies on Ethics",
    slug: "policies-on-ethics",
    aliases: [
      "policies on ethics",
      "ethics",
      "ethics policy",
      "ethical policy",
      "publication ethics",
      "ethical guidelines",
      "ethics and malpractice",
      "publication ethics and malpractice",
    ],
    settingNames: [],
    builtinTypes: [],
  },
  {
    title: "Copyright & Licensing Policies",
    slug: "copyright-licensing",
    aliases: [
      "copyright and licensing policies",
      "copyright licensing policies",
      "copyright and licensing",
      "copyright licensing",
      "copyright",
      "copyright notice",
      "copyright policy",
      "licensing",
      "licensing policy",
      "license",
    ],
    settingNames: ["copyrightNotice"],
    builtinTypes: [],
  },
  {
    title: "Editorial Workflow",
    slug: "editorial-workflow",
    aliases: [
      "editorial workflow",
      "workflow",
      "editorial process",
      "review policy",
      "peer review",
      "peer review policy",
      "peer review process",
      "editorial policy",
    ],
    settingNames: ["reviewPolicy"],
    builtinTypes: [],
  },
  {
    title: "Indexing & Archiving",
    slug: "indexing-archiving",
    aliases: [
      "indexing and archiving",
      "indexing archiving",
      "indexing",
      "archiving",
      "archive policy",
      "archiving policy",
      "self archiving policy",
      "self archiving",
      "author self archive policy",
      "author self archiving policy",
    ],
    settingNames: ["authorSelfArchivePolicy"],
    builtinTypes: [],
  },
  {
    title: "DOIs & ORCID",
    slug: "dois-orcid",
    aliases: [
      "dois and orcid",
      "doi and orcid",
      "dois orcid",
      "doi orcid",
      "digital object identifier and orcid",
      "orcid",
      "dois",
      "doi",
      "digital object identifier",
    ],
    settingNames: [],
    builtinTypes: [],
  },
]

// ── Normalization & matching ────────────────────────────────────────────────

/**
 * Canonical form for matching. Case-insensitive; `&` is treated as `and`;
 * any non-alphanumeric run collapses to a single space; leading/trailing
 * whitespace is stripped.
 *
 * Examples that resolve to "dois and orcid":
 *   "DOIs & ORCID"
 *   "dois-orcid"
 *   "DOIs and ORCID"
 */
export function normalizePolicyKey(value: string | null | undefined): string {
  if (!value) return ""
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Return the approved policy that matches any of the provided candidate
 * strings (title / slug / path / setting name), or `null` if none match.
 */
export function matchApprovedPolicy(
  candidates: ReadonlyArray<string | null | undefined>,
): ApprovedPolicy | null {
  const normalizedCandidates = candidates
    .map(normalizePolicyKey)
    .filter((v) => v.length > 0)

  if (normalizedCandidates.length === 0) return null

  for (const policy of APPROVED_POLICIES) {
    const aliasSet = new Set(policy.aliases.map(normalizePolicyKey))
    // Also treat the canonical title/slug as aliases
    aliasSet.add(normalizePolicyKey(policy.title))
    aliasSet.add(normalizePolicyKey(policy.slug))
    for (const settingName of policy.settingNames) {
      aliasSet.add(normalizePolicyKey(settingName))
    }
    for (const cand of normalizedCandidates) {
      if (aliasSet.has(cand)) return policy
    }
  }
  return null
}

// ── Sanitization config ─────────────────────────────────────────────────────

const POLICY_SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "h5", "blockquote", "span", "div",
    "table", "tbody", "tr", "td", "th", "thead", "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["class", "style"],
  },
}

function sanitizePolicy(raw: string | null): string {
  if (!raw) return ""
  return sanitizeHtml(raw, POLICY_SANITIZE_OPTIONS)
}

// ── Locale resolution ───────────────────────────────────────────────────────

/**
 * Priority: primaryLocale → '' (unlocalized) → any available locale.
 */
function pickBestLocale(
  rows: { setting_name: string; setting_value: string | null; locale: string }[],
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

// ── Candidate collection ────────────────────────────────────────────────────
//
// A candidate is a piece of content + identifying keys (title, slug, path,
// type, settingName). Candidates are matched against APPROVED_POLICIES and
// non-matches are discarded. When multiple candidates target the same
// approved policy, the first one (in source priority order) wins.

interface PolicyCandidate {
  titleHint: string | null
  slug: string | null
  path: string | null
  type: string | null
  settingName: string | null
  content: string
  /** Lower = higher priority when multiple candidates match same policy */
  priority: number
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function fetchJournalPolicies(ojsJournalId: string): Promise<JournalPolicies> {
  const empty: JournalPolicies = {
    tabs: [],
    doiEnabled: false,
    requireAuthorCompetingInterestsEnabled: false,
  }

  if (!/^\d+$/.test(ojsJournalId)) return empty

  const journalId = parseInt(ojsJournalId, 10)

  // ── Resolve primary locale ──────────────────────────────────────────────
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

  // ── Parallel data fetches from all OJS sources ──────────────────────────

  // Pre-compute the union of all setting names referenced by approved policies
  const allPolicySettingNames = Array.from(
    new Set(APPROVED_POLICIES.flatMap((p) => p.settingNames)),
  )
  const policyPlaceholders = allPolicySettingNames.map(() => "?").join(", ")

  const [configRows, menuRows, policySettingRows, staticPageRows, standaloneNavRows] = await Promise.all([
    // 1. DOI / Competing-Interests toggles
    ojsQuery<SettingRow>(
      `SELECT setting_name, setting_value, locale
       FROM journal_settings
       WHERE journal_id = ?
         AND setting_name IN ('enableDois', 'requireAuthorCompetingInterests')
         AND (locale = ? OR locale = '')`,
      [journalId, primaryLocale],
    ).catch((err): SettingRow[] => {
      console.error(`[JournalPolicies] Failed to load DOI/competing-interests config for journal_id=${journalId}:`, err)
      return []
    }),

    // 2. Navigation menu items from the "Journal Policies" custom menu
    ojsQuery<MenuRow>(
      `SELECT
          nmi.navigation_menu_item_id,
          nmi.path  AS slug,
          nmi.type,
          nmia.seq,
          nmis.setting_name,
          nmis.setting_value,
          nmis.locale
       FROM navigation_menus nm
       JOIN navigation_menu_item_assignments nmia
         ON nm.navigation_menu_id = nmia.navigation_menu_id
       JOIN navigation_menu_items nmi
         ON nmia.navigation_menu_item_id = nmi.navigation_menu_item_id
       LEFT JOIN navigation_menu_item_settings nmis
         ON nmi.navigation_menu_item_id = nmis.navigation_menu_item_id
       WHERE nm.title = 'Journal Policies'
         AND nm.context_id = ?
       ORDER BY nmia.seq ASC`,
      [journalId],
    ).catch((err): MenuRow[] => {
      console.error(`[JournalPolicies] Failed to load "Journal Policies" navigation menu for journal_id=${journalId}:`, err)
      return []
    }),

    // 3. Standard policy fields from journal_settings (content source + fallback)
    allPolicySettingNames.length > 0
      ? ojsQuery<SettingRow>(
          `SELECT setting_name, setting_value, locale
           FROM journal_settings
           WHERE journal_id = ?
             AND setting_name IN (${policyPlaceholders})
             AND (locale = ? OR locale = '')`,
          [journalId, ...allPolicySettingNames, primaryLocale],
        ).catch((err): SettingRow[] => {
          console.error(`[JournalPolicies] Failed to load standard policy settings for journal_id=${journalId}:`, err)
          return []
        })
      : Promise.resolve<SettingRow[]>([]),

    // 4. Static pages (plugin-managed content — table may not exist)
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
      console.error(`[JournalPolicies] Failed to load static pages for journal_id=${journalId}:`, err)
      return []
    }),

    // 5. Standalone navigation_menu_items with content for this journal.
    ojsQuery<StandaloneNavRow>(
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
       WHERE nmi.context_id = ?
         AND nmi.path IS NOT NULL
         AND nmi.path != ''`,
      [journalId],
    ).catch((err): StandaloneNavRow[] => {
      console.error(`[JournalPolicies] Failed to load standalone nav items for journal_id=${journalId}:`, err)
      return []
    }),
  ])

  // ── Config toggles ─────────────────────────────────────────────────────

  const doiRaw = pickBestLocale(configRows, "enableDois", primaryLocale)
  const competingInterestsRaw = pickBestLocale(configRows, "requireAuthorCompetingInterests", primaryLocale)

  // ── Gather candidates from every source ─────────────────────────────────

  const candidates: PolicyCandidate[] = []

  // SOURCE 1 — "Journal Policies" navigation menu (highest priority)
  if (menuRows.length > 0) {
    const itemsMap = new Map<
      number,
      {
        id: number
        slug: string
        type: string
        seq: number
        settings: { setting_name: string; setting_value: string | null; locale: string }[]
      }
    >()

    for (const row of menuRows) {
      if (!itemsMap.has(row.navigation_menu_item_id)) {
        itemsMap.set(row.navigation_menu_item_id, {
          id: row.navigation_menu_item_id,
          slug: row.slug,
          type: row.type || "",
          seq: row.seq,
          settings: [],
        })
      }
      if (row.setting_name) {
        itemsMap.get(row.navigation_menu_item_id)!.settings.push({
          setting_name: row.setting_name,
          setting_value: row.setting_value,
          locale: row.locale,
        })
      }
    }

    for (const item of Array.from(itemsMap.values()).sort((a, b) => a.seq - b.seq)) {
      const titleHint = pickBestLocale(item.settings, "title", primaryLocale)
      let content = pickBestLocale(item.settings, "content", primaryLocale)

      // Built-in types (e.g. NMI_TYPE_PRIVACY) resolve content from journal_settings
      if (!content) {
        const policyByType = APPROVED_POLICIES.find((p) => p.builtinTypes.includes(item.type))
        if (policyByType) {
          for (const settingName of policyByType.settingNames) {
            content = pickBestLocale(policySettingRows, settingName, primaryLocale)
            if (content) break
          }
        }
      }

      // Resolve via matching static page
      if (!content && item.slug) {
        const matching = staticPageRows.filter((r) => r.path === item.slug)
        if (matching.length > 0) {
          content = pickBestLocale(
            matching.map((r) => ({
              setting_name: r.setting_name,
              setting_value: r.setting_value,
              locale: r.locale,
            })),
            "content",
            primaryLocale,
          )
        }
      }

      const sanitized = sanitizePolicy(content)
      if (!sanitized.trim()) continue

      candidates.push({
        titleHint,
        slug: item.slug || null,
        path: null,
        type: item.type || null,
        settingName: null,
        content: sanitized,
        priority: 1,
      })
    }
  }

  // SOURCE 2 — Standalone navigation_menu_items
  if (standaloneNavRows.length > 0) {
    const standaloneMap = new Map<
      number,
      {
        path: string
        type: string
        settings: { setting_name: string; setting_value: string | null; locale: string }[]
      }
    >()

    for (const row of standaloneNavRows) {
      if (!standaloneMap.has(row.navigation_menu_item_id)) {
        standaloneMap.set(row.navigation_menu_item_id, {
          path: row.path,
          type: row.type || "",
          settings: [],
        })
      }
      if (row.setting_name) {
        standaloneMap.get(row.navigation_menu_item_id)!.settings.push({
          setting_name: row.setting_name,
          setting_value: row.setting_value,
          locale: row.locale,
        })
      }
    }

    for (const [, item] of standaloneMap) {
      const titleHint = pickBestLocale(item.settings, "title", primaryLocale)
      let content = pickBestLocale(item.settings, "content", primaryLocale)

      if (!content) {
        const policyByType = APPROVED_POLICIES.find((p) => p.builtinTypes.includes(item.type))
        if (policyByType) {
          for (const settingName of policyByType.settingNames) {
            content = pickBestLocale(policySettingRows, settingName, primaryLocale)
            if (content) break
          }
        }
      }

      if (!content && item.path) {
        const matching = staticPageRows.filter((r) => r.path === item.path)
        if (matching.length > 0) {
          content = pickBestLocale(
            matching.map((r) => ({
              setting_name: r.setting_name,
              setting_value: r.setting_value,
              locale: r.locale,
            })),
            "content",
            primaryLocale,
          )
        }
      }

      const sanitized = sanitizePolicy(content)
      if (!sanitized.trim()) continue

      candidates.push({
        titleHint,
        slug: null,
        path: item.path || null,
        type: item.type || null,
        settingName: null,
        content: sanitized,
        priority: 2,
      })
    }
  }

  // SOURCE 3 — journal_settings keys directly
  for (const policy of APPROVED_POLICIES) {
    for (const settingName of policy.settingNames) {
      const raw = pickBestLocale(policySettingRows, settingName, primaryLocale)
      const sanitized = sanitizePolicy(raw)
      if (!sanitized.trim()) continue
      candidates.push({
        titleHint: null,
        slug: null,
        path: null,
        type: null,
        settingName,
        content: sanitized,
        priority: 3,
      })
    }
  }

  // SOURCE 4 — static_pages
  const staticPagesMap = new Map<
    number,
    { path: string; settings: { setting_name: string; setting_value: string | null; locale: string }[] }
  >()
  for (const row of staticPageRows) {
    if (!staticPagesMap.has(row.static_page_id)) {
      staticPagesMap.set(row.static_page_id, { path: row.path, settings: [] })
    }
    if (row.setting_name) {
      staticPagesMap.get(row.static_page_id)!.settings.push({
        setting_name: row.setting_name,
        setting_value: row.setting_value,
        locale: row.locale,
      })
    }
  }
  for (const [, page] of staticPagesMap) {
    const titleHint = pickBestLocale(page.settings, "title", primaryLocale)
    const raw = pickBestLocale(page.settings, "content", primaryLocale)
    const sanitized = sanitizePolicy(raw)
    if (!sanitized.trim()) continue
    candidates.push({
      titleHint,
      slug: null,
      path: page.path || null,
      type: null,
      settingName: null,
      content: sanitized,
      priority: 4,
    })
  }

  // ── Strict filter: map each candidate to an approved policy slot ────────

  const slots = new Map<string, { policy: ApprovedPolicy; content: string; priority: number }>()

  for (const candidate of candidates) {
    const policy = matchApprovedPolicy([
      candidate.titleHint,
      candidate.slug,
      candidate.path,
      candidate.settingName,
    ])
    if (!policy) {
      // Non-approved: skip silently (this is the whole point of the filter).
      continue
    }

    const existing = slots.get(policy.slug)
    if (!existing || candidate.priority < existing.priority) {
      slots.set(policy.slug, {
        policy,
        content: candidate.content,
        priority: candidate.priority,
      })
    }
  }

  // ── Emit in canonical order ─────────────────────────────────────────────

  const tabs: PolicyTab[] = []
  for (const policy of APPROVED_POLICIES) {
    const slot = slots.get(policy.slug)
    if (!slot) {
      // Missing content — hide the tab and log a warning so operators can
      // see which policies are unconfigured on the OJS side.
      console.warn(
        `[JournalPolicies] No OJS content found for approved policy "${policy.title}" (journal_id=${journalId}).`,
      )
      continue
    }
    tabs.push({
      title: policy.title,
      slug: policy.slug,
      content: slot.content,
    })
  }

  return {
    tabs,
    doiEnabled: doiRaw === "1" || doiRaw === "true",
    requireAuthorCompetingInterestsEnabled: competingInterestsRaw === "1" || competingInterestsRaw === "true",
  }
}
