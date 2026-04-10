import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import {
  helpArticleCreateSchema,
  helpArticleUpdateSchema,
  helpArticleIdParamSchema,
} from "@/src/features/help-articles/schemas/help-article-schema"

const app = new Hono()

const HELP_ARTICLE_SELECT = {
  id: true,
  title: true,
  content: true,
  category: true,
  icon: true,
  display_order: true,
  is_published: true,
  created_at: true,
  updated_at: true,
} as const

// GET /help-articles - List help articles (public: published only; admin: all, paginated)
app.get("/", async (c) => {
  try {
    const pagination = parsePagination(c)
    const session = await getSession()
    const isAdmin = session && (session.role === "admin" || session.role === "superadmin")
    const where = isAdmin ? {} : { is_published: true }

    const [articles, total] = await Promise.all([
      prisma.helpArticle.findMany({
        where,
        select: HELP_ARTICLE_SELECT,
        orderBy: [{ display_order: "asc" }, { created_at: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.helpArticle.count({ where }),
    ])

    return c.json(paginatedResponse(serializeMany(articles), total, pagination), 200)
  } catch (error) {
    console.error("Error fetching help articles:", error)
    return c.json({ success: false, error: "Failed to fetch help articles" }, 500)
  }
})

// GET /help-articles/:id
app.get("/:id", zValidator("param", helpArticleIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const article = await prisma.helpArticle.findUnique({
      where: { id: BigInt(id) },
      select: HELP_ARTICLE_SELECT,
    })

    if (!article) {
      return c.json({ success: false, error: "Help article not found" }, 404)
    }

    if (!article.is_published) {
      const session = await getSession()
      if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return c.json({ success: false, error: "Help article not found" }, 404)
      }
    }

    return c.json({ success: true, data: serializeRecord(article) }, 200)
  } catch (error) {
    console.error("Error fetching help article:", error)
    return c.json({ success: false, error: "Failed to fetch help article" }, 500)
  }
})

// POST /help-articles - Create help article (admin only)
app.post("/", requireAdmin, zValidator("json", helpArticleCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")
    const article = await prisma.helpArticle.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        icon: data.icon,
        display_order: data.display_order,
        is_published: data.is_published,
      },
      select: HELP_ARTICLE_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(article), message: "Help article created successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating help article:", error)
    return c.json({ success: false, error: "Failed to create help article" }, 500)
  }
})

// PATCH /help-articles/:id - Update help article (admin only)
app.patch(
  "/:id",
  requireAdmin,
  zValidator("param", helpArticleIdParamSchema),
  zValidator("json", helpArticleUpdateSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param")
      const data = c.req.valid("json")

      const article = await prisma.helpArticle.update({
        where: { id: BigInt(id) },
        data,
        select: HELP_ARTICLE_SELECT,
      })

      return c.json(
        { success: true, data: serializeRecord(article), message: "Help article updated successfully" },
        200
      )
    } catch (error: any) {
      if (error.code === "P2025") {
        return c.json({ success: false, error: "Help article not found" }, 404)
      }
      console.error("Error updating help article:", error)
      return c.json({ success: false, error: "Failed to update help article" }, 500)
    }
  }
)

// DELETE /help-articles/:id - Delete help article (admin only)
app.delete(
  "/:id",
  requireAdmin,
  zValidator("param", helpArticleIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param")
      const canonicalId = BigInt(id).toString()

      await prisma.helpArticle.delete({
        where: { id: BigInt(id) },
      })

      return c.json(
        { success: true, data: { id: canonicalId }, message: "Help article deleted successfully" },
        200
      )
    } catch (error: any) {
      if (error.code === "P2025") {
        return c.json({ success: false, error: "Help article not found" }, 404)
      }
      console.error("Error deleting help article:", error)
      return c.json({ success: false, error: "Failed to delete help article" }, 500)
    }
  }
)

export { app as helpArticleRouter }
