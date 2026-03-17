import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { journalCreateSchema, journalUpdateSchema, journalIdParamSchema } from "../schemas/journal-schema"

const app = new Hono()

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
  ojs_path: true,
} as const

// ─── GET /journals — Public listing (Prisma only) ───────────────────

app.get("/", async (c) => {
  try {
    const pagination = parsePagination(c)
    let [journals, total] = await Promise.all([
      prisma.journal.findMany({
        select: JOURNAL_SELECT,
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
              select: JOURNAL_SELECT,
              orderBy: { created_at: "desc" },
              take: pagination.limit,
              skip: pagination.offset,
            }),
            prisma.journal.count(),
          ])
          journals = newJournals
          total = newTotal
        } catch (syncError: any) {
          console.error("Inline sync fallback failed:", syncError)
          return c.json({ success: false, error: "OJS DB Connection or Sync failed: " + (syncError.message || String(syncError)) }, 500)
        }
      }
    }

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

    // First try lookup by ojs_id (for OJS-sourced navigation)
    let journal = await prisma.journal.findUnique({
      where: { ojs_id: id },
      select: JOURNAL_SELECT,
    })

    // Fallback to internal BigInt id (for admin-created journals)
    if (!journal && /^\d+$/.test(id)) {
      journal = await prisma.journal.findUnique({
        where: { id: BigInt(id) },
        select: JOURNAL_SELECT,
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
