import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { getSession } from "@/lib/db/auth"
import { prisma } from "@/lib/db/config"
import { solutionCreateSchema, solutionUpdateSchema, solutionIdParamSchema } from "../schemas/solution-schema"

const app = new Hono()

const SOLUTION_SELECT = {
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

// GET /solutions - List solutions (public: published only; admin: all, paginated)
app.get("/", async (c) => {
  try {
    const pagination = parsePagination(c)
    const session = await getSession()
    const isAdmin = session && (session.role === "admin" || session.role === "superadmin")
    const where = isAdmin ? {} : { is_published: true }

    const [solutions, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        select: SOLUTION_SELECT,
        orderBy: { created_at: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.fAQ.count({ where }),
    ])

    return c.json(paginatedResponse(serializeMany(solutions), total, pagination), 200)
  } catch (error) {
    console.error("Error fetching solutions:", error)
    return c.json({ success: false, error: "Failed to fetch solutions" }, 500)
  }
})

// GET /solutions/:id - Get single solution (public for published, admin only for draft)
app.get("/:id", zValidator("param", solutionIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const solution = await prisma.fAQ.findUnique({
      where: { id: BigInt(id) },
      select: SOLUTION_SELECT,
    })

    if (!solution) {
      return c.json({ success: false, error: "Solution not found" }, 404)
    }

    if (!solution.is_published) {
      const session = await getSession()
      if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return c.json({ success: false, error: "Not found" }, 404)
      }
    }

    return c.json({ success: true, data: serializeRecord(solution) }, 200)
  } catch (error) {
    console.error("Error fetching solution:", error)
    return c.json({ success: false, error: "Failed to fetch solution" }, 500)
  }
})

// POST /solutions - Create solution (admin only)
app.post("/", requireAdmin, zValidator("json", solutionCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")
    const solution = await prisma.fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category || "general",
        is_published: data.is_published || false,
      },
      select: SOLUTION_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(solution), message: "Solution created successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating solution:", error)
    return c.json({ success: false, error: "Failed to create solution" }, 500)
  }
})

// PATCH /solutions/:id - Update solution (admin only)
app.patch("/:id", requireAdmin, zValidator("param", solutionIdParamSchema), zValidator("json", solutionUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const existingSolution = await prisma.fAQ.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingSolution) {
      return c.json({ success: false, error: "Solution not found" }, 404)
    }

    const updateData: Partial<typeof data> = {}
    if (data.question !== undefined) updateData.question = data.question
    if (data.answer !== undefined) updateData.answer = data.answer
    if (data.category !== undefined) updateData.category = data.category
    if (data.is_published !== undefined) updateData.is_published = data.is_published

    const solution = await prisma.fAQ.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: SOLUTION_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(solution), message: "Solution updated successfully" },
      200
    )
  } catch (error) {
    console.error("Error updating solution:", error)
    return c.json({ success: false, error: "Failed to update solution" }, 500)
  }
})

// DELETE /solutions/:id - Delete solution (admin only)
app.delete("/:id", requireAdmin, zValidator("param", solutionIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const existingSolution = await prisma.fAQ.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingSolution) {
      return c.json({ success: false, error: "Solution not found" }, 404)
    }

    await prisma.fAQ.delete({
      where: { id: BigInt(id) },
    })

    return c.json({ success: true, message: "Solution deleted successfully" }, 200)
  } catch (error) {
    console.error("Error deleting solution:", error)
    return c.json({ success: false, error: "Failed to delete solution" }, 500)
  }
})

export { app as solutionRouter }
