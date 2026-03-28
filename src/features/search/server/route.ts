import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/src/lib/db/config"
import { searchQuerySchema } from "../schemas/search-schema"
import type { SearchResult } from "../schemas/search-schema"

const app = new Hono()

// GET /search?q=...&type=all|journal|solution|faq&limit=20
app.get("/", zValidator("query", searchQuerySchema), async (c) => {
  try {
    const { q, type, limit: limitStr } = c.req.valid("query")
    const limit = Math.min(parseInt(limitStr, 10) || 20, 50)

    const results: SearchResult[] = []

    // Search Journals
    if (type === "all" || type === "journal") {
      const journals = await prisma.journal.findMany({
        where: {
          status: "active",
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { field: { contains: q } },
            { publisher: { contains: q } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          field: true,
        },
        take: type === "all" ? Math.ceil(limit / 3) : limit,
        orderBy: { title: "asc" },
      })

      for (const j of journals) {
        results.push({
          id: j.id.toString(),
          type: "journal",
          title: j.title,
          description: j.description?.slice(0, 150) || "",
          url: `/journals/${j.id}`,
          field: j.field,
        })
      }
    }

    // Search Solutions
    if (type === "all" || type === "solution") {
      const solutions = await prisma.solution.findMany({
        where: {
          is_published: true,
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
        },
        take: type === "all" ? Math.ceil(limit / 3) : limit,
        orderBy: { display_order: "asc" },
      })

      for (const s of solutions) {
        results.push({
          id: s.id.toString(),
          type: "solution",
          title: s.title,
          description: s.description?.slice(0, 150) || "",
          url: "/solutions",
          icon: s.icon,
        })
      }
    }

    // Search FAQs
    if (type === "all" || type === "faq") {
      const faqs = await prisma.fAQ.findMany({
        where: {
          is_published: true,
          OR: [
            { question: { contains: q } },
            { answer: { contains: q } },
          ],
        },
        select: {
          id: true,
          question: true,
          answer: true,
          category: true,
        },
        take: type === "all" ? Math.ceil(limit / 3) : limit,
        orderBy: { created_at: "desc" },
      })

      for (const f of faqs) {
        results.push({
          id: f.id.toString(),
          type: "faq",
          title: f.question,
          description: f.answer?.slice(0, 150) || "",
          url: "/help",
          field: f.category,
        })
      }
    }

    return c.json({
      success: true,
      data: {
        results,
        total: results.length,
        query: q,
      },
    })
  } catch (error) {
    console.error("[SEARCH_ERROR]", error)
    return c.json({ success: false, error: "Search failed" }, 500)
  }
})

export { app as searchRouter }
