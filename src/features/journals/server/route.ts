import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { journalCreateSchema, journalUpdateSchema, journalIdParamSchema, journalSlugParamSchema } from "@/src/features/journals/schemas/journal-schema"

const app = new Hono()

const LIST_JOURNAL_SELECT = {
  id: true,
  title: true,
  abbreviation: true,
  issn: true,
  e_issn: true,
  description: true,
  field: true,
  publisher: true,
  editor_in_chief: true,
  frequency: true,
  submission_fee: true,
  publication_fee: true,
  cover_image_url: true,
  website_url: true,
  status: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  ojs_id: true,
  ojs_path: true,
} as const

const DETAIL_JOURNAL_SELECT = {
  ...LIST_JOURNAL_SELECT,
  aims_and_scope: true,
  author_guidelines: true,
} as const

// ─── GET /journals/debug-covers (TEMPORARY FOR OJS SCHEMA) ──────────
app.get("/debug-covers", requireAdmin, async (c) => {
  try {
    const { ojsQuery } = await import("@/src/features/ojs/server/ojs-client")
    
    const [issueSettings, isCovers, pubSettings, pubCovers] = await Promise.all([
      ojsQuery("SELECT DISTINCT setting_name FROM issue_settings WHERE setting_name LIKE '%cover%'"),
      ojsQuery("SELECT * FROM issue_settings WHERE setting_name = 'coverImage' LIMIT 5"),
      ojsQuery("SELECT DISTINCT setting_name FROM publication_settings WHERE setting_name LIKE '%cover%'"),
      ojsQuery("SELECT * FROM publication_settings WHERE setting_name = 'coverImage' LIMIT 5")
    ])
    
    return c.json({ 
      success: true, 
      data: { issueSettings, isCovers, pubSettings, pubCovers } 
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return c.json({ success: false, error: errorMsg }, 500)
  }
})

// ─── GET /journals — Public listing (Prisma only) ───────────────────

app.get("/", async (c) => {
  try {
    const pagination = parsePagination(c)
    let [journals, total] = await Promise.all([
      prisma.journal.findMany({
        select: LIST_JOURNAL_SELECT,
        orderBy: { created_at: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.journal.count(),
    ])

    // If local Prisma is empty but OJS is configured, block and await a sync before returning.
    // This prevents the "No journals available yet" empty state on the very first visit after a cold start.
    if (total === 0) {
      const { isOjsConfigured } = await import("@/src/features/ojs/server/ojs-client")
      if (isOjsConfigured()) {
        const { fetchFromDatabase } = await import("@/src/features/ojs/server/ojs-service")
        const { syncOjsJournals } = await import("@/src/features/ojs/server/sync-ojs-journals")
        try {
          const ojsData = await fetchFromDatabase(true)
          await syncOjsJournals(ojsData)
          
          // Re-query after sync
          const [newJournals, newTotal] = await Promise.all([
            prisma.journal.findMany({
              select: LIST_JOURNAL_SELECT,
              orderBy: { created_at: "desc" },
              take: pagination.limit,
              skip: pagination.offset,
            }),
            prisma.journal.count(),
          ])
          journals = newJournals
          total = newTotal
        } catch (syncError) {
          console.error("Inline sync fallback failed:", syncError)
          return c.json({ success: false, error: "OJS DB Connection or Sync failed" }, 500)
        }
      }
    }

    return c.json(paginatedResponse(serializeMany(journals), total, pagination), 200)
  } catch (error) {
    console.error("Error fetching journals:", error)
    return c.json({ success: false, error: "Failed to fetch journals" }, 500)
  }
})

// ─── GET /journals/:id — Public detail (supports slug, ojs_id, or numeric id) ──

app.get("/:id", zValidator("param", journalSlugParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    // 1. Try lookup by ojs_path (slug-based URL — primary)
    let journal = await prisma.journal.findUnique({
      where: { ojs_path: id },
      select: DETAIL_JOURNAL_SELECT,
    })

    // 2. Fallback to ojs_id (for legacy OJS-sourced navigation)
    if (!journal) {
      journal = await prisma.journal.findUnique({
        where: { ojs_id: id },
        select: DETAIL_JOURNAL_SELECT,
      })
    }

    // 3. Fallback to internal BigInt id (for admin-created journals)
    if (!journal && /^\d+$/.test(id)) {
      journal = await prisma.journal.findUnique({
        where: { id: BigInt(id) },
        select: DETAIL_JOURNAL_SELECT,
      })
    }

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    return c.json({ success: true, data: serializeRecord(journal) }, 200)
  } catch (error) {
    console.error("Error fetching journal:", error)
    return c.json({ success: false, error: "Failed to fetch journal" }, 500)
  }
})

// ─── GET /journals/:id/stats — Real-time OJS Metrics ─────────────────

app.get("/:id/stats", zValidator("param", journalSlugParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    let journal = await prisma.journal.findUnique({ where: { ojs_path: id }, select: { ojs_id: true, id: true } })
    if (!journal) journal = await prisma.journal.findUnique({ where: { ojs_id: id }, select: { ojs_id: true, id: true } })
    if (!journal && /^\d+$/.test(id)) journal = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select: { ojs_id: true, id: true } })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    if (!journal.ojs_id) {
      return c.json({ success: true, data: { articles: 0, issues: 0 }, message: "No OJS data" }, 200)
    }

    const { isOjsConfigured, ojsQuery } = await import("@/src/features/ojs/server/ojs-client")
    
    if (!isOjsConfigured()) {
       return c.json({ success: true, data: { articles: 0, issues: 0 }, message: "No OJS data" }, 200)
    }

    try {
      // Run queries in parallel
      const [articlesResult, issuesResult] = await Promise.all([
        ojsQuery<{ count: number }>('SELECT CAST(COUNT(*) AS UNSIGNED) as count FROM submissions WHERE context_id = ? AND status = 3', [journal.ojs_id]),
        ojsQuery<{ count: number }>('SELECT CAST(COUNT(*) AS UNSIGNED) as count FROM issues WHERE journal_id = ? AND published = 1', [journal.ojs_id])
      ])

      const articles = Number(articlesResult?.[0]?.count || 0)
      const issues = Number(issuesResult?.[0]?.count || 0)

      return c.json({ success: true, data: { articles, issues } }, 200)
    } catch (queryError) {
      console.error("OJS Query Error:", queryError)
      return c.json({ success: false, error: "Failed to fetch OJS stats" }, 502)
    }
  } catch (error) {
    console.error("Error fetching journal stats:", error)
    return c.json({ success: false, error: "Failed to fetch journal stats" }, 500)
  }
})

// ─── GET /journals/:id/current-issue — Current Issue from OJS ────────

app.get("/:id/current-issue", zValidator("param", journalSlugParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    let journal = await prisma.journal.findUnique({ where: { ojs_path: id }, select: { ojs_id: true, id: true } })
    if (!journal) journal = await prisma.journal.findUnique({ where: { ojs_id: id }, select: { ojs_id: true, id: true } })
    if (!journal && /^\d+$/.test(id)) journal = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select: { ojs_id: true, id: true } })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    if (!journal.ojs_id) {
      return c.json({ success: true, data: null, message: "No OJS data" }, 200)
    }

    const { isOjsConfigured } = await import("@/src/features/ojs/server/ojs-client")

    if (!isOjsConfigured()) {
      return c.json({ success: true, data: null, message: "OJS not configured" }, 200)
    }

    try {
      const { fetchCurrentIssue } = await import("./current-issue-service")
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CurrentIssue API] Calling fetchCurrentIssue with ojs_id="${journal.ojs_id}" (resolved from param="${id}", prisma_id=${journal.id})`)
      }
      const currentIssue = await fetchCurrentIssue(journal.ojs_id)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CurrentIssue API] Result: ${currentIssue ? `issue_id=${currentIssue.issueId}, articles=${currentIssue.articles.length}` : "null"}`)
      }
      return c.json({ success: true, data: currentIssue }, 200)
    } catch (queryError) {
      console.error("[CurrentIssue API] OJS Query Error:", queryError)
      return c.json({ success: false, error: "Failed to fetch current issue from OJS" }, 502)
    }
  } catch (error) {
    console.error("Error fetching current issue:", error)
    return c.json({ success: false, error: "Failed to fetch current issue" }, 500)
  }
})

// ─── GET /journals/:id/archive — Archive Issues from OJS ────────────

app.get("/:id/archive", zValidator("param", journalSlugParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    let journal = await prisma.journal.findUnique({ where: { ojs_path: id }, select: { ojs_id: true, id: true } })
    if (!journal) journal = await prisma.journal.findUnique({ where: { ojs_id: id }, select: { ojs_id: true, id: true } })
    if (!journal && /^\d+$/.test(id)) journal = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select: { ojs_id: true, id: true } })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    if (!journal.ojs_id) {
      return c.json({ success: true, data: [], message: "No OJS data" }, 200)
    }

    const { isOjsConfigured } = await import("@/src/features/ojs/server/ojs-client")

    if (!isOjsConfigured()) {
      return c.json({ success: true, data: [], message: "OJS not configured" }, 200)
    }

    try {
      const { fetchArchiveIssues } = await import("./archive-issue-service")
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Archive API] Calling fetchArchiveIssues with ojs_id="${journal.ojs_id}" (resolved from param="${id}")`)
      }
      const archiveIssues = await fetchArchiveIssues(journal.ojs_id)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Archive API] Result: ${archiveIssues.length} archive issues`)
      }
      return c.json({ success: true, data: archiveIssues }, 200)
    } catch (queryError) {
      console.error("[Archive API] OJS Query Error:", queryError)
      return c.json({ success: false, error: "Failed to fetch archive issues from OJS" }, 502)
    }
  } catch (error) {
    console.error("Error fetching archive issues:", error)
    return c.json({ success: false, error: "Failed to fetch archive issues" }, 500)
  }
})

// ─── GET /journals/:id/editorial-board — OJS Masthead Members ────────

app.get("/:id/editorial-board", zValidator("param", journalSlugParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    let journal = await prisma.journal.findUnique({ where: { ojs_path: id }, select: { ojs_id: true, id: true } })
    if (!journal) journal = await prisma.journal.findUnique({ where: { ojs_id: id }, select: { ojs_id: true, id: true } })
    if (!journal && /^\d+$/.test(id)) journal = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select: { ojs_id: true, id: true } })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    if (!journal.ojs_id) {
      return c.json({ success: true, data: { members: [] }, message: "No OJS data" }, 200)
    }

    const { isOjsConfigured } = await import("@/src/features/ojs/server/ojs-client")

    if (!isOjsConfigured()) {
      return c.json({ success: true, data: { members: [] }, message: "OJS not configured" }, 200)
    }

    try {
      const { fetchEditorialBoard } = await import("./editorial-board-service")
      const members = await fetchEditorialBoard(journal.ojs_id)
      return c.json({ success: true, data: { members } }, 200)
    } catch (queryError) {
      console.error("[EditorialBoard API] OJS Query Error:", queryError)
      return c.json({ success: false, error: "Failed to fetch editorial board from OJS" }, 502)
    }
  } catch (error) {
    console.error("Error fetching editorial board:", error)
    return c.json({ success: false, error: "Failed to fetch editorial board" }, 500)
  }
})

// ─── GET /journals/:id/custom-blocks — OJS Custom Block Manager ───────

app.get("/:id/custom-blocks", zValidator("param", journalSlugParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    let journal = await prisma.journal.findUnique({ where: { ojs_path: id }, select: { ojs_id: true, id: true } })
    if (!journal) journal = await prisma.journal.findUnique({ where: { ojs_id: id }, select: { ojs_id: true, id: true } })
    if (!journal && /^\d+$/.test(id)) journal = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select: { ojs_id: true, id: true } })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    if (!journal.ojs_id) {
      return c.json({ success: true, data: { blocks: [] }, message: "No OJS data" }, 200)
    }

    const { isOjsConfigured } = await import("@/src/features/ojs/server/ojs-client")

    if (!isOjsConfigured()) {
      return c.json({ success: true, data: { blocks: [] }, message: "OJS not configured" }, 200)
    }

    try {
      // Resolve primary locale for block content localisation
      const { ojsQuery } = await import("@/src/features/ojs/server/ojs-client")
      const localeRows = await ojsQuery<{ primary_locale: string }>(
        "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
        [journal.ojs_id]
      )
      const primaryLocale = localeRows[0]?.primary_locale ?? "en_US"

      const { fetchCustomBlocks } = await import("./custom-blocks-service")
      const blocks = await fetchCustomBlocks(journal.ojs_id, primaryLocale)
      return c.json({ success: true, data: { blocks } }, 200)
    } catch (queryError) {
      console.error("[CustomBlocks API] OJS Query Error:", queryError)
      return c.json({ success: false, error: "Failed to fetch custom blocks from OJS" }, 502)
    }
  } catch (error) {
    console.error("Error fetching custom blocks:", error)
    return c.json({ success: false, error: "Failed to fetch custom blocks" }, 500)
  }
})

const journalIssueParamSchema = z.object({
  id: z.string().min(1),
  issueId: z.string().regex(/^\d+$/, "Issue ID must be numeric")
})

app.get("/:id/issues/:issueId", zValidator("param", journalIssueParamSchema), async (c) => {
  try {
    const { id, issueId: rawIssueId } = c.req.valid("param")
    const issueId = parseInt(rawIssueId, 10)

    let journal = await prisma.journal.findUnique({ where: { ojs_path: id }, select: { ojs_id: true, id: true } })
    if (!journal) journal = await prisma.journal.findUnique({ where: { ojs_id: id }, select: { ojs_id: true, id: true } })
    if (!journal && /^\d+$/.test(id)) journal = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select: { ojs_id: true, id: true } })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    if (!journal.ojs_id) {
      return c.json({ success: true, data: null, message: "No OJS data" }, 200)
    }

    const { isOjsConfigured } = await import("@/src/features/ojs/server/ojs-client")

    if (!isOjsConfigured()) {
      return c.json({ success: true, data: null, message: "OJS not configured" }, 200)
    }

    try {
      const { fetchIssueWithArticles } = await import("./archive-issue-service")
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[IssueDetail API] Calling fetchIssueWithArticles(ojs_id="${journal.ojs_id}", issueId=${issueId})`)
      }
      const issueDetail = await fetchIssueWithArticles(journal.ojs_id, issueId)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[IssueDetail API] Result: ${issueDetail ? `issue_id=${issueDetail.issueId}, articles=${issueDetail.articles.length}` : "null"}`)
      }
      return c.json({ success: true, data: issueDetail }, 200)
    } catch (queryError) {
      console.error("[IssueDetail API] OJS Query Error:", queryError)
      return c.json({ success: false, error: "Failed to fetch issue detail from OJS" }, 502)
    }
  } catch (error) {
    console.error("Error fetching issue detail:", error)
    return c.json({ success: false, error: "Failed to fetch issue detail" }, 500)
  }
})

const journalArticleParamSchema = z.object({
  id: z.string().min(1),
  publicationId: z.string().regex(/^\d+$/, "Publication ID must be numeric")
})

app.get("/:id/articles/:publicationId", zValidator("param", journalArticleParamSchema), async (c) => {
  try {
    const { id, publicationId: rawPubId } = c.req.valid("param")
    const publicationId = parseInt(rawPubId, 10)

    let journal = await prisma.journal.findUnique({ where: { ojs_path: id }, select: { ojs_id: true, id: true } })
    if (!journal) journal = await prisma.journal.findUnique({ where: { ojs_id: id }, select: { ojs_id: true, id: true } })
    if (!journal && /^\d+$/.test(id)) journal = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select: { ojs_id: true, id: true } })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    if (!journal.ojs_id) {
      return c.json({ success: true, data: null, message: "No OJS data" }, 200)
    }

    const { isOjsConfigured } = await import("@/src/features/ojs/server/ojs-client")

    if (!isOjsConfigured()) {
      return c.json({ success: true, data: null, message: "OJS not configured" }, 200)
    }

    try {
      const { fetchArticleDetail } = await import("./article-detail-service")
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[ArticleDetail API] Calling fetchArticleDetail(ojs_id="${journal.ojs_id}", pubId=${publicationId})`)
      }
      const detail = await fetchArticleDetail(journal.ojs_id, publicationId)
      
      if (!detail) {
        return c.json({ success: false, error: "Article not found" }, 404)
      }
      return c.json({ success: true, data: detail }, 200)
    } catch (queryError) {
      console.error("[ArticleDetail API] OJS Query Error:", queryError)
      return c.json({ success: false, error: "Failed to fetch article detail from OJS" }, 502)
    }
  } catch (error) {
    console.error("Error fetching article detail:", error)
    return c.json({ success: false, error: "Failed to fetch article detail" }, 500)
  }
})

// ─── POST /journals — Admin create (Prisma only) ────────────────────



  app.post("/", requireAdmin, zValidator("json", journalCreateSchema), async (c) => {
    try {
      const session = c.get("session" as never) as { id: string } | undefined
      if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }
    const data = c.req.valid("json")
    const journal = await prisma.journal.create({
      data: {
        title: data.title,
        abbreviation: data.abbreviation || null,
        issn: data.issn || null,
        e_issn: data.e_issn || null,
        description: data.description || null,
        field: data.field,
        publisher: data.publisher || null,
        editor_in_chief: data.editor_in_chief || null,
        frequency: data.frequency || null,
        submission_fee: data.submission_fee || 0,
        publication_fee: data.publication_fee || 0,
        cover_image_url: data.cover_image_url || null,
        website_url: data.website_url || null,
        status: data.status || "active",
        created_by: BigInt(session.id),
      },
      select: DETAIL_JOURNAL_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(journal), message: "Journal created successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating journal:", error)
    return c.json({ success: false, error: "Failed to create journal" }, 500)
  }
})

// ─── PATCH /journals/:id — Admin update (Prisma only) ───────────────

app.patch("/:id", requireAdmin, zValidator("param", journalIdParamSchema), zValidator("json", journalUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const existingJournal = await prisma.journal.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingJournal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value
      }
    }

    const journal = await prisma.journal.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: DETAIL_JOURNAL_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(journal), message: "Journal updated successfully" },
      200
    )
  } catch (error) {
    console.error("Error updating journal:", error)
    return c.json({ success: false, error: "Failed to update journal" }, 500)
  }
})

// ─── DELETE /journals/:id — Admin delete (Prisma only) ──────────────

app.delete("/:id", requireAdmin, zValidator("param", journalIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const existingJournal = await prisma.journal.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingJournal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    await prisma.journal.delete({
      where: { id: BigInt(id) },
    })

    return c.json({ success: true, message: "Journal deleted successfully" }, 200)
  } catch (error) {
    console.error("Error deleting journal:", error)
    return c.json({ success: false, error: "Failed to delete journal" }, 500)
  }
})

/**
 * Proxy for OJS PDFs to strip restrictive framing headers
 */
app.get("/proxy-pdf", async (c) => {
  const urlBase64 = c.req.query("url")

  if (!urlBase64) {
    return c.text("Missing URL parameter", 400)
  }

  const OJS_BASE_URL = process.env.OJS_BASE_URL || process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://submitmanager.com"
  const timeoutMs = 15000 // 15s timeout for fetching PDF

  try {
    const targetUrlStr = Buffer.from(urlBase64, 'base64').toString('utf-8')
    const targetUrl = new URL(targetUrlStr)
    
    // 1. Strict Protocol Enforcement
    if (targetUrl.protocol !== 'https:') {
      return c.text("Invalid protocol: Only HTTPS is allowed", 403)
    }

    // 2. Strict Origin/hostname Validation
    const allowedHostname = new URL(OJS_BASE_URL).hostname
    const isAllowedOrigin = targetUrl.hostname === allowedHostname || 
                            targetUrl.hostname.endsWith('.' + allowedHostname) ||
                            targetUrl.hostname === 'digitopub.com' ||
                            targetUrl.hostname.endsWith('.digitopub.com')

    if (!isAllowedOrigin) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Proxy] Blocked attempt to fetch from unauthorized domain: ${targetUrl.hostname}`)
      }
      return c.text("Unauthorized target domain", 403)
    }

    // 3. Pathname check: ensure we are only proxying potential PDFs
    const isPdfPath = targetUrl.pathname.toLowerCase().endsWith('.pdf') || 
                      targetUrl.pathname.toLowerCase().includes('/article/download/')
    
    if (!isPdfPath) {
       return c.text("Invalid target: Only PDF documents are allowed", 403)
    }

    // 4. Timeout Management
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Digitopub PDF Proxy/1.1 (Security-Hardened)',
        },
        signal: controller.signal
      })

      clearTimeout(id)

      if (!response.ok) {
        return new Response(`Failed to fetch from upstream: ${response.statusText}`, { status: response.status })
      }

      // Pipe the response back to the client, but omit framing restrictions
      const headers = new Headers(response.headers)
      headers.delete('X-Frame-Options')
      headers.delete('Content-Security-Policy')
      
      const upstreamContentType = response.headers.get('content-type')?.toLowerCase() || ''
      
      // Only force PDF headers if the upstream content is actually a PDF
      if (upstreamContentType.includes('application/pdf')) {
        headers.set('Content-Type', 'application/pdf')
        headers.set('Content-Disposition', 'inline')
      }
      
      return new Response(response.body, {
        status: 200,
        headers
      })
    } catch (fetchError) {
      clearTimeout(id)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error("[Proxy] Timeout fetching PDF from:", targetUrl.toString())
        return c.text("Request Timeout: Upstream OJS is taking too long to respond", 504)
      }
      throw fetchError
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('Invalid URL')) {
       return c.text("Malformed URL parameter", 400)
    }
    console.error("PDF Proxy Error:", error)
    return c.text("Internal Server Error", 500)
  }
})

export { app as journalRouter }
