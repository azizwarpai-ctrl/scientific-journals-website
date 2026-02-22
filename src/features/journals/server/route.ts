import { Hono } from "hono"
import { getSession } from "@/lib/db/auth"
import { prisma } from "@/lib/db/config"
import { journalCreateSchema, journalUpdateSchema, journalIdParamSchema } from "../schemas/journal-schema"
import type { Journal } from "../types/journal-type"

const app = new Hono()

// Helper to serialize BigInt to string
const serializeJournal = (journal: any): Journal => ({
  ...journal,
  id: journal.id.toString(),
  created_by: journal.created_by?.toString() || null,
  submission_fee: journal.submission_fee || 0,
  publication_fee: journal.publication_fee || 0,
})

// GET /journals - List all journals (public)
app.get("/", async (c) => {
  try {
    const journals = await prisma.journal.findMany({
      select: {
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
      },
      orderBy: { created_at: "desc" },
    })

    return c.json(
      { success: true, data: journals.map(serializeJournal) },
      200
    )
  } catch (error) {
    console.error("Error fetching journals:", error)
    return c.json({ success: false, error: "Failed to fetch journals" }, 500)
  }
})

// GET /journals/:id - Get single journal (public)
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param()
    const validation = journalIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid journal ID",
        },
        400
      )
    }

    const journal = await prisma.journal.findUnique({
      where: { id: BigInt(id) },
      select: {
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
      },
    })

    if (!journal) {
      return c.json(
        { success: false, error: "Journal not found" },
        404
      )
    }

    return c.json({ success: true, data: serializeJournal(journal) }, 200)
  } catch (error) {
    console.error("Error fetching journal:", error)
    return c.json({ success: false, error: "Failed to fetch journal" }, 500)
  }
})

// POST /journals - Create journal (auth required)
app.post("/", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const body = await c.req.json()
    const validation = journalCreateSchema.safeParse(body)

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          data: validation.error.issues,
        },
        400
      )
    }

    const data = validation.data
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
      select: {
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
      },
    })

    return c.json(
      { success: true, data: serializeJournal(journal), message: "Journal created successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating journal:", error)
    return c.json({ success: false, error: "Failed to create journal" }, 500)
  }
})

// PATCH /journals/:id - Update journal (auth required)
app.patch("/:id", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.param()
    const validation = journalIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid journal ID",
        },
        400
      )
    }

    const body = await c.req.json()
    const dataValidation = journalUpdateSchema.safeParse(body)

    if (!dataValidation.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          data: dataValidation.error.issues,
        },
        400
      )
    }

    // Check if journal exists
    const existingJournal = await prisma.journal.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingJournal) {
      return c.json(
        { success: false, error: "Journal not found" },
        404
      )
    }

    const data = dataValidation.data
    const updateData: any = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.abbreviation !== undefined) updateData.abbreviation = data.abbreviation
    if (data.issn !== undefined) updateData.issn = data.issn
    if (data.e_issn !== undefined) updateData.e_issn = data.e_issn
    if (data.description !== undefined) updateData.description = data.description
    if (data.field !== undefined) updateData.field = data.field
    if (data.publisher !== undefined) updateData.publisher = data.publisher
    if (data.editor_in_chief !== undefined) updateData.editor_in_chief = data.editor_in_chief
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.submission_fee !== undefined) updateData.submission_fee = data.submission_fee
    if (data.publication_fee !== undefined) updateData.publication_fee = data.publication_fee
    if (data.cover_image_url !== undefined) updateData.cover_image_url = data.cover_image_url
    if (data.website_url !== undefined) updateData.website_url = data.website_url
    if (data.status !== undefined) updateData.status = data.status

    const journal = await prisma.journal.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: {
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
      },
    })

    return c.json(
      { success: true, data: serializeJournal(journal), message: "Journal updated successfully" },
      200
    )
  } catch (error) {
    console.error("Error updating journal:", error)
    return c.json({ success: false, error: "Failed to update journal" }, 500)
  }
})

// DELETE /journals/:id - Delete journal (auth required)
app.delete("/:id", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.param()
    const validation = journalIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid journal ID",
        },
        400
      )
    }

    const existingJournal = await prisma.journal.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingJournal) {
      return c.json(
        { success: false, error: "Journal not found" },
        404
      )
    }

    await prisma.journal.delete({
      where: { id: BigInt(id) },
    })

    return c.json(
      { success: true, message: "Journal deleted successfully" },
      200
    )
  } catch (error) {
    console.error("Error deleting journal:", error)
    return c.json({ success: false, error: "Failed to delete journal" }, 500)
  }
})

export { app as journalRouter }
