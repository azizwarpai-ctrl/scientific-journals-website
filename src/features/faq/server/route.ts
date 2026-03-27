import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { faqCreateSchema, faqUpdateSchema, faqIdParamSchema } from "@/src/features/faq/schemas/faq-schema"

const app = new Hono()

const FAQ_SELECT = {
  id: true,
  question: true,
  answer: true,
  category: true,
  is_published: true,
  view_count: true,
  helpful_count: true,
  created_at: true,
  updated_at: true,
} as const

// GET /faqs - List FAQs (public: published only; admin: all, paginated)
app.get("/", async (c) => {
  try {
    const pagination = parsePagination(c)
    const session = await getSession()
    const isAdmin = session && (session.role === "admin" || session.role === "superadmin")
    const where = isAdmin ? {} : { is_published: true }

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        select: FAQ_SELECT,
        orderBy: { created_at: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.fAQ.count({ where }),
    ])

    return c.json(paginatedResponse(serializeMany(faqs), total, pagination), 200)
  } catch (error) {
    console.error("Error fetching FAQs:", error)
    return c.json({ success: false, error: "Failed to fetch FAQs" }, 500)
  }
})

// GET /faqs/:id
app.get("/:id", zValidator("param", faqIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const faq = await prisma.fAQ.findUnique({
      where: { id: BigInt(id) },
      select: FAQ_SELECT,
    })

    if (!faq) {
      return c.json({ success: false, error: "FAQ not found" }, 404)
    }

    if (!faq.is_published) {
      const session = await getSession()
      if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return c.json({ success: false, error: "FAQ not found" }, 404)
      }
    }

    return c.json({ success: true, data: serializeRecord(faq) }, 200)
  } catch (error) {
    console.error("Error fetching FAQ:", error)
    return c.json({ success: false, error: "Failed to fetch FAQ" }, 500)
  }
})

// POST /faqs - Create FAQ (admin only)
app.post("/", requireAdmin, zValidator("json", faqCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")
    const faq = await prisma.fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category,
        is_published: data.is_published,
      },
      select: FAQ_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(faq), message: "FAQ created successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating FAQ:", error)
    return c.json({ success: false, error: "Failed to create FAQ" }, 500)
  }
})

// PATCH /faqs/:id - Update FAQ (admin only)
app.patch("/:id", requireAdmin, zValidator("param", faqIdParamSchema), zValidator("json", faqUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const faq = await prisma.fAQ.update({
      where: { id: BigInt(id) },
      data,
      select: FAQ_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(faq), message: "FAQ updated successfully" },
      200
    )
  } catch (error: any) {
    if (error.code === 'P2025') {
       return c.json({ success: false, error: "FAQ not found" }, 404)
    }
    console.error("Error updating FAQ:", error)
    return c.json({ success: false, error: "Failed to update FAQ" }, 500)
  }
})

// DELETE /faqs/:id - Delete FAQ (admin only)
app.delete("/:id", requireAdmin, zValidator("param", faqIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    await prisma.fAQ.delete({
      where: { id: BigInt(id) },
    })

    return c.json({ success: true, data: { id }, message: "FAQ deleted successfully" }, 200)
  } catch (error: any) {
    if (error.code === 'P2025') {
       return c.json({ success: false, error: "FAQ not found" }, 404)
    }
    console.error("Error deleting FAQ:", error)
    return c.json({ success: false, error: "Failed to delete FAQ" }, 500)
  }
})

export { app as faqRouter }
