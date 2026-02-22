import { Hono } from "hono"
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
app.get("/:id", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.param()
    const validation = messageIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json({ success: false, error: "Invalid message ID" }, 400)
    }

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
app.post("/", async (c) => {
  try {
    const body = await c.req.json()
    const validation = messageCreateSchema.safeParse(body)

    if (!validation.success) {
      return c.json(
        { success: false, error: "Validation failed", data: validation.error.issues },
        400
      )
    }

    const data = validation.data
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
app.patch("/:id", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.param()
    const idValidation = messageIdParamSchema.safeParse({ id })

    if (!idValidation.success) {
      return c.json({ success: false, error: "Invalid message ID" }, 400)
    }

    const body = await c.req.json()
    const dataValidation = messageUpdateSchema.safeParse(body)

    if (!dataValidation.success) {
      return c.json(
        { success: false, error: "Validation failed", data: dataValidation.error.issues },
        400
      )
    }

    const existing = await prisma.message.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Message not found" }, 404)
    }

    const updateData: any = {}
    if (dataValidation.data.status !== undefined) updateData.status = dataValidation.data.status

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
app.delete("/:id", async (c) => {
  try {
    const session = await getSession()
    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401)
    }

    const { id } = c.req.param()
    const validation = messageIdParamSchema.safeParse({ id })

    if (!validation.success) {
      return c.json({ success: false, error: "Invalid message ID" }, 400)
    }

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
