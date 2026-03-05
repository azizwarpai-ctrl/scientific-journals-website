import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { prisma } from "@/lib/db/config"
import { journalCreateSchema, journalUpdateSchema, journalIdParamSchema } from "../schemas/journal-schema"

const app = new Hono()

// ─── PHP Proxy helper ───────────────────────────────────────────────

const OJS_BASE_URL = "https://submitmanager.com/api"

async function fetchFromProxy(action: string, params: Record<string, string> = {}): Promise<any> {
  const url = process.env.OJS_API_URL || `${OJS_BASE_URL}/api.php`
  const apiKey = process.env.OJS_API_KEY || ""

  const searchParams = new URLSearchParams({ action, ...params })
  const separator = url.includes("?") ? "&" : "?"
  const fullUrl = `${url}${separator}${searchParams.toString()}`

  const response = await fetch(fullUrl, {
    headers: { "X-API-KEY": apiKey },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`OJS proxy returned ${response.status}`)
  }

  const json = await response.json() as any
  if (!json.success) {
    throw new Error(json.error || "OJS proxy error")
  }

  return json
}

function isProxyConfigured(): boolean {
  return !!(process.env.OJS_API_URL || process.env.OJS_API_KEY)
}

// ─── Field mapping: OJS → Journal interface ─────────────────────────

function mapOjsJournalToJournal(ojs: any): any {
  return {
    id: String(ojs.journal_id),
    title: ojs.name || ojs.settings?.name || "Untitled",
    abbreviation: ojs.abbreviation || ojs.settings?.acronym || null,
    issn: ojs.settings?.printIssn || null,
    e_issn: ojs.settings?.onlineIssn || null,
    description: ojs.description || ojs.settings?.description || null,
    field: mapLocaleToField(ojs.primary_locale),
    publisher: ojs.settings?.publisherInstitution || "DigitoPub",
    editor_in_chief: ojs.settings?.contactName || null,
    frequency: null,
    submission_fee: 0,
    publication_fee: 0,
    cover_image_url: buildThumbnailUrl(ojs),
    website_url: ojs.path ? `https://submitmanager.com/${ojs.path}` : null,
    status: ojs.enabled ? "active" : "inactive",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    ojs_id: String(ojs.journal_id),
  }
}

function mapLocaleToField(locale: string | null): string {
  const fieldMap: Record<string, string> = {
    en: "Multidisciplinary",
    en_US: "Multidisciplinary",
    fr_FR: "Multidisciplinaire",
    ar: "متعدد التخصصات",
  }
  return fieldMap[locale || "en"] || "Multidisciplinary"
}

function buildThumbnailUrl(ojs: any): string | null {
  const thumbnail = ojs.thumbnail || ojs.settings?.journalThumbnail
  if (!thumbnail) return null
  // OJS stores thumbnail as JSON with uploadName, or as a direct path
  if (typeof thumbnail === "string") {
    if (thumbnail.startsWith("http")) return thumbnail
    return `https://submitmanager.com/public/journals/${ojs.journal_id}/${thumbnail}`
  }
  // If it's a JSON object with uploadName
  try {
    const parsed = typeof thumbnail === "object" ? thumbnail : JSON.parse(thumbnail)
    if (parsed.uploadName) {
      return `https://submitmanager.com/public/journals/${ojs.journal_id}/${parsed.uploadName}`
    }
  } catch { /* not JSON */ }
  return null
}

const JOURNAL_SELECT = {
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
} as const

// ─── GET /journals — Public listing ─────────────────────────────────

app.get("/", async (c) => {
  try {
    // Try PHP proxy first (OJS data on SiteGround)
    if (isProxyConfigured()) {
      const json = await fetchFromProxy("journals")
      const journals = (json.data || []).map(mapOjsJournalToJournal)
      return c.json({
        success: true,
        data: journals,
        total: journals.length,
        limit: journals.length,
        offset: 0,
      }, 200)
    }

    // Fallback: Prisma (Hostinger local DB)
    const pagination = parsePagination(c)
    const [journals, total] = await Promise.all([
      prisma.journal.findMany({
        select: JOURNAL_SELECT,
        orderBy: { created_at: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.journal.count(),
    ])
    return c.json(paginatedResponse(serializeMany(journals), total, pagination), 200)
  } catch (error) {
    console.error("Error fetching journals:", error)
    return c.json({ success: false, error: "Failed to fetch journals" }, 500)
  }
})

// ─── GET /journals/:id — Public detail ──────────────────────────────

app.get("/:id", zValidator("param", journalIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    // Try PHP proxy first (OJS journal detail)
    if (isProxyConfigured()) {
      try {
        const json = await fetchFromProxy("journal", { id })
        const journal = mapOjsJournalToJournal(json.data)
        return c.json({ success: true, data: journal }, 200)
      } catch (proxyErr: any) {
        // If proxy returns 404, pass through
        if (proxyErr.message?.includes("404")) {
          return c.json({ success: false, error: "Journal not found" }, 404)
        }
        throw proxyErr
      }
    }

    // Fallback: Prisma
    const journal = await prisma.journal.findUnique({
      where: { id: BigInt(id) },
      select: JOURNAL_SELECT,
    })

    if (!journal) {
      return c.json({ success: false, error: "Journal not found" }, 404)
    }

    return c.json({ success: true, data: serializeRecord(journal) }, 200)
  } catch (error) {
    console.error("Error fetching journal:", error)
    return c.json({ success: false, error: "Failed to fetch journal" }, 500)
  }
})

// ─── POST /journals — Admin create (Prisma only) ────────────────────

app.post("/", requireAdmin, zValidator("json", journalCreateSchema), async (c) => {
  try {
    const session = (c as any).get("session")
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
      select: JOURNAL_SELECT,
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

    const updateData: Partial<typeof data> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (updateData as any)[key] = value
      }
    }

    const journal = await prisma.journal.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: JOURNAL_SELECT,
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

export { app as journalRouter }
