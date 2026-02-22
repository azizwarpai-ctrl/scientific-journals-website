import { Hono } from "hono"
import { getSession } from "@/lib/db/auth"
import { prisma } from "@/lib/db/config"
import { solutionCreateSchema, solutionUpdateSchema, solutionIdParamSchema } from "../schemas/solution-schema"
import type { Solution } from "../types/solution-type"

const app = new Hono()

// Helper to serialize BigInt to string
const serializeSolution = (solution: any): Solution => ({
  ...solution,
  id: solution.id.toString(),
})

// GET /solutions - List published solutions (public)
app.get("/", async (c) => {
  try {
    const isAdmin = await getSession()
    const where = isAdmin ? {} : { is_published: true }

    const solutions = await prisma.fAQ.findMany({
      where,
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        is_published: true,
        view_count: true,
        helpful_count: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
    })

    return c.json(
      { success: true, data: solutions.map(serializeSolution) },
      200
    )
  } catch (error) {
    console.error("Error fetching solutions:", error)
    return c.json({ success: false, error: "Failed to fetch solutions" }, 500)
  }
})

// GET /solutions/:id - Get single solution (public for published, admin only for draft)
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param()
    const validation = solutionIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid solution ID",
        },
        400
      )
    }

    const solution = await prisma.fAQ.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        is_published: true,
        view_count: true,
        helpful_count: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!solution) {
      return c.json(
        { success: false, error: "Solution not found" },
        404
      )
    }

    // Check if published or if user is admin
    if (!solution.is_published) {
      const session = await getSession()
      if (!session) {
        return c.json(
          { success: false, error: "Not found" },
          404
        )
      }
    }

    return c.json({ success: true, data: serializeSolution(solution) }, 200)
  } catch (error) {
    console.error("Error fetching solution:", error)
    return c.json({ success: false, error: "Failed to fetch solution" }, 500)
  }
})

// POST /solutions - Create solution (auth required)
app.post("/", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const body = await c.req.json()
    const validation = solutionCreateSchema.safeParse(body)

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
    const solution = await prisma.fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category || "general",
        is_published: data.is_published || false,
      },
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        is_published: true,
        view_count: true,
        helpful_count: true,
        created_at: true,
        updated_at: true,
      },
    })

    return c.json(
      { success: true, data: serializeSolution(solution), message: "Solution created successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating solution:", error)
    return c.json({ success: false, error: "Failed to create solution" }, 500)
  }
})

// PATCH /solutions/:id - Update solution (auth required)
app.patch("/:id", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.param()
    const validation = solutionIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid solution ID",
        },
        400
      )
    }

    const body = await c.req.json()
    const dataValidation = solutionUpdateSchema.safeParse(body)

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

    // Check if solution exists
    const existingSolution = await prisma.fAQ.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingSolution) {
      return c.json(
        { success: false, error: "Solution not found" },
        404
      )
    }

    const data = dataValidation.data
    const updateData: any = {}

    if (data.question !== undefined) updateData.question = data.question
    if (data.answer !== undefined) updateData.answer = data.answer
    if (data.category !== undefined) updateData.category = data.category
    if (data.is_published !== undefined) updateData.is_published = data.is_published

    const solution = await prisma.fAQ.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        is_published: true,
        view_count: true,
        helpful_count: true,
        created_at: true,
        updated_at: true,
      },
    })

    return c.json(
      { success: true, data: serializeSolution(solution), message: "Solution updated successfully" },
      200
    )
  } catch (error) {
    console.error("Error updating solution:", error)
    return c.json({ success: false, error: "Failed to update solution" }, 500)
  }
})

// DELETE /solutions/:id - Delete solution (auth required)
app.delete("/:id", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.param()
    const validation = solutionIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid solution ID",
        },
        400
      )
    }

    const existingSolution = await prisma.fAQ.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingSolution) {
      return c.json(
        { success: false, error: "Solution not found" },
        404
      )
    }

    await prisma.fAQ.delete({
      where: { id: BigInt(id) },
    })

    return c.json(
      { success: true, message: "Solution deleted successfully" },
      200
    )
  } catch (error) {
    console.error("Error deleting solution:", error)
    return c.json({ success: false, error: "Failed to delete solution" }, 500)
  }
})

export { app as solutionRouter }
