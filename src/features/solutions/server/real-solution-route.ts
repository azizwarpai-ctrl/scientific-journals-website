import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { Prisma } from "@prisma/client"
import {
  realSolutionCreateSchema as solutionCreateSchema,
  realSolutionUpdateSchema as solutionUpdateSchema,
  realSolutionIdParamSchema as solutionIdParamSchema,
  REAL_SOLUTION_SELECT as SOLUTION_SELECT,
} from "../schemas/real-solution-schema"

const app = new Hono()

// GET /solutions - Public listing (published only, ordered by display_order)
app.get("/", async (c) => {
  try {
    const pagination = parsePagination(c)
    const where = { is_published: true }

    const [solutions, total] = await Promise.all([
      prisma.solution.findMany({
        where,
        select: SOLUTION_SELECT,
        orderBy: { display_order: "asc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.solution.count({ where }),
    ])

    return c.json(paginatedResponse(serializeMany(solutions), total, pagination), 200)
  } catch (error) {
    console.error("Error fetching solutions:", error)
    return c.json({ success: false, error: "Failed to fetch solutions" }, 500)
  }
})

// GET /solutions/:id
app.get("/:id", zValidator("param", solutionIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const solution = await prisma.solution.findUnique({
      where: { id: BigInt(id) },
      select: SOLUTION_SELECT,
    })

    if (!solution || !solution.is_published) {
      return c.json({ success: false, error: "Solution not found" }, 404)
    }

    return c.json({ success: true, data: serializeRecord(solution) }, 200)
  } catch (error) {
    console.error("Error fetching solution:", error)
    return c.json({ success: false, error: "Failed to fetch solution" }, 500)
  }
})

// POST /solutions - Admin create
app.post("/", requireAdmin, zValidator("json", solutionCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")
    const solution = await prisma.solution.create({
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon || null,
        features: data.features ?? Prisma.JsonNull,
        display_order: data.display_order || 0,
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

// PATCH /solutions/:id - Admin update
app.patch("/:id", requireAdmin, zValidator("param", solutionIdParamSchema), zValidator("json", solutionUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const existing = await prisma.solution.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Solution not found" }, 404)
    }

    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value
    }

    const solution = await prisma.solution.update({
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

// DELETE /solutions/:id - Admin delete
app.delete("/:id", requireAdmin, zValidator("param", solutionIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const existing = await prisma.solution.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Solution not found" }, 404)
    }

    await prisma.solution.delete({
      where: { id: BigInt(id) },
    })

    return c.json({ success: true, message: "Solution deleted successfully" }, 200)
  } catch (error) {
    console.error("Error deleting solution:", error)
    return c.json({ success: false, error: "Failed to delete solution" }, 500)
  }
})

export { app as realSolutionRouter }
