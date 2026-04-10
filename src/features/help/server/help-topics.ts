import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { prisma } from "@/src/lib/db/config"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { helpTopicSchema } from "../schemas/help-category-schema"

const app = new Hono()

// Get topic by id (public)
app.get("/:id", async (c) => {
  try {
    const id = BigInt(c.req.param("id"))
    const topic = await prisma.helpTopic.findUnique({
      where: { id },
      include: {
        category: true
      }
    })

    if (!topic) {
      return c.json({ success: false, error: "Topic not found" }, 404)
    }

    const serialized = {
      ...topic,
      id: String(topic.id),
      category_id: String(topic.category_id),
      category: {
        ...topic.category,
        id: String(topic.category.id)
      }
    }

    return c.json({ success: true, data: serialized })
  } catch (error) {
    console.error("[HELP_TOPIC_GET_ERROR]", error)
    return c.json({ success: false, error: "Failed to fetch topic" }, 500)
  }
})

// Create topic (admin)
app.post(
  "/",
  requireAdmin,
  zValidator("json", helpTopicSchema),
  async (c) => {
    try {
      const body = c.req.valid("json")
      
      const topic = await prisma.helpTopic.create({
        data: {
          category_id: BigInt(body.categoryId),
          title: body.title,
          content: body.content,
          order: body.order,
          is_active: body.isActive,
        }
      })

      return c.json({ 
        success: true, 
        data: { ...topic, id: String(topic.id), category_id: String(topic.category_id) },
        message: "Topic created successfully" 
      }, 201)
    } catch (error: any) {
      console.error("[HELP_TOPIC_CREATE_ERROR]", error)
      return c.json({ success: false, error: "Failed to create topic" }, 500)
    }
  }
)

// Update topic (admin)
app.put(
  "/:id",
  requireAdmin,
  zValidator("json", helpTopicSchema),
  async (c) => {
    try {
      const id = BigInt(c.req.param("id"))
      const body = c.req.valid("json")
      
      const topic = await prisma.helpTopic.update({
        where: { id },
        data: {
          category_id: BigInt(body.categoryId),
          title: body.title,
          content: body.content,
          order: body.order,
          is_active: body.isActive,
        }
      })

      return c.json({ 
        success: true, 
        data: { ...topic, id: String(topic.id), category_id: String(topic.category_id) },
        message: "Topic updated successfully" 
      })
    } catch (error: any) {
      console.error("[HELP_TOPIC_UPDATE_ERROR]", error)
      if (error.code === 'P2025') {
        return c.json({ success: false, error: "Topic not found" }, 404)
      }
      return c.json({ success: false, error: "Failed to update topic" }, 500)
    }
  }
)

// Delete topic (admin)
app.delete("/:id", requireAdmin, async (c) => {
  try {
    const id = BigInt(c.req.param("id"))
    
    await prisma.helpTopic.delete({
      where: { id }
    })

    return c.json({ success: true, message: "Topic deleted successfully" })
  } catch (error: any) {
    console.error("[HELP_TOPIC_DELETE_ERROR]", error)
    if (error.code === 'P2025') {
      return c.json({ success: false, error: "Topic not found" }, 404)
    }
    return c.json({ success: false, error: "Failed to delete topic" }, 500)
  }
})

// Reorder topics (admin)
app.put(
  "/reorder/:categoryId", 
  requireAdmin,
  zValidator("json", z.object({ topicIds: z.array(z.string()) })),
  async (c) => {
    try {
      const categoryId = BigInt(c.req.param("categoryId"))
      const { topicIds } = c.req.valid("json")

      // Using transaction to update all orders
      await prisma.$transaction(
        topicIds.map((id: string, index: number) => 
          prisma.helpTopic.update({
            where: { id: BigInt(id) },
            data: { 
              order: index,
              category_id: categoryId 
            }
          })
        )
      )

      return c.json({ success: true, message: "Topics reordered successfully" })
    } catch (error: any) {
      console.error("[HELP_TOPIC_REORDER_ERROR]", error)
      return c.json({ success: false, error: "Failed to reorder topics" }, 500)
    }
  }
)

export { app as helpTopicsRouter }
