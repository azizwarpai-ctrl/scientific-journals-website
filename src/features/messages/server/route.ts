import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { prisma } from "@/lib/db/config"
import { messageCreateSchema, messageUpdateSchema, messageIdParamSchema } from "../schemas/message-schema"

const app = new Hono()

const MESSAGE_SELECT = {
  id: true,
  name: true,
  email: true,
  subject: true,
  message: true,
  message_type: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const

// GET /messages - List all messages (admin only, paginated)
app.get("/", requireAdmin, async (c) => {
  try {
    const pagination = parsePagination(c)

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        select: MESSAGE_SELECT,
        orderBy: { created_at: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.message.count(),
    ])

    return c.json(paginatedResponse(serializeMany(messages), total, pagination), 200)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return c.json({ success: false, error: "Failed to fetch messages" }, 500)
  }
})

// GET /messages/:id - Get single message (admin only)
app.get("/:id", requireAdmin, zValidator("param", messageIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const message = await prisma.message.findUnique({
      where: { id: BigInt(id) },
      select: MESSAGE_SELECT,
    })

    if (!message) {
      return c.json({ success: false, error: "Message not found" }, 404)
    }

    return c.json({ success: true, data: serializeRecord(message) }, 200)
  } catch (error) {
    console.error("Error fetching message:", error)
    return c.json({ success: false, error: "Failed to fetch message" }, 500)
  }
})

// POST /messages - Send a contact message (public)
app.post("/", zValidator("json", messageCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")

    const message = await prisma.message.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        message_type: data.message_type || "general",
      },
      select: MESSAGE_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(message), message: "Message sent successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating message:", error)
    return c.json({ success: false, error: "Failed to send message" }, 500)
  }
})

// PATCH /messages/:id - Update message status (admin only)
app.patch("/:id", requireAdmin, zValidator("param", messageIdParamSchema), zValidator("json", messageUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const existingMessage = await prisma.message.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingMessage) {
      return c.json({ success: false, error: "Message not found" }, 404)
    }

    const updateData: Partial<typeof data> = {}
    if (data.status !== undefined) updateData.status = data.status

    const message = await prisma.message.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: MESSAGE_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(message), message: "Message updated successfully" },
      200
    )
  } catch (error) {
    console.error("Error updating message:", error)
    return c.json({ success: false, error: "Failed to update message" }, 500)
  }
})

// DELETE /messages/:id - Delete message (admin only)
app.delete("/:id", requireAdmin, zValidator("param", messageIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const existingMessage = await prisma.message.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existingMessage) {
      return c.json({ success: false, error: "Message not found" }, 404)
    }

    await prisma.message.delete({
      where: { id: BigInt(id) },
    })

    return c.json({ success: true, message: "Message deleted successfully" }, 200)
  } catch (error) {
    console.error("Error deleting message:", error)
    return c.json({ success: false, error: "Failed to delete message" }, 500)
  }
})

export { app as messageRouter }
