import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { getSession } from "@/lib/db/auth"
import { prisma } from "@/lib/db/config"
import { messageCreateSchema, messageUpdateSchema, messageIdParamSchema } from "../schemas/message-schema"
import type { Message } from "../types/message-type"

const app = new Hono()

const serializeMessage = (msg: any): Message => ({
  ...msg,
  id: msg.id.toString(),
})

// GET /messages - List all messages (auth required)
app.get("/", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const messages = await prisma.message.findMany({
      orderBy: { created_at: "desc" },
    })

    return c.json({ success: true, data: messages.map(serializeMessage) }, 200)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return c.json({ success: false, error: "Failed to fetch messages" }, 500)
  }
})

// GET /messages/:id - Get single message (auth required)
app.get("/:id", zValidator("param", messageIdParamSchema), async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.valid("param")

    const message = await prisma.message.findUnique({
      where: { id: BigInt(id) },
    })

    if (!message) {
      return c.json({ success: false, error: "Message not found" }, 404)
    }

    return c.json({ success: true, data: serializeMessage(message) }, 200)
  } catch (error) {
    console.error("Error fetching message:", error)
    return c.json({ success: false, error: "Failed to fetch message" }, 500)
  }
})

// POST /messages - Create message (public, for contact forms)
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
        status: "unread",
      },
    })

    return c.json(
      { success: true, data: serializeMessage(message), message: "Message sent successfully" },
      201
    )
  } catch (error) {
    console.error("Error creating message:", error)
    return c.json({ success: false, error: "Failed to send message" }, 500)
  }
})

// PATCH /messages/:id - Update message status (auth required)
app.patch("/:id", zValidator("param", messageIdParamSchema), zValidator("json", messageUpdateSchema), async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const existing = await prisma.message.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Message not found" }, 404)
    }

    const updateData: any = {}
    if (data.status !== undefined) updateData.status = data.status

    const message = await prisma.message.update({
      where: { id: BigInt(id) },
      data: updateData,
    })

    return c.json(
      { success: true, data: serializeMessage(message), message: "Message updated successfully" },
      200
    )
  } catch (error) {
    console.error("Error updating message:", error)
    return c.json({ success: false, error: "Failed to update message" }, 500)
  }
})

// DELETE /messages/:id - Delete message (auth required)
app.delete("/:id", zValidator("param", messageIdParamSchema), async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.valid("param")

    const existing = await prisma.message.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existing) {
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
