import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/src/lib/db/config"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { helpCategorySchema } from "../schemas/help-category-schema"

const app = new Hono()

// Get all categories (public)
app.get("/", async (c) => {
  try {
    const categories = await prisma.helpCategory.findMany({
      orderBy: { created_at: "asc" },
      include: {
        topics: {
          orderBy: { order: "asc" }
        }
      }
    })
    
    // Convert BigInt to string for JSON serialization
    const serialized = categories.map(cat => ({
      ...cat,
      id: String(cat.id),
      topics: cat.topics.map(topic => ({
        ...topic,
        id: String(topic.id),
        category_id: String(topic.category_id)
      }))
    }))

    return c.json({ success: true, data: serialized })
  } catch (error) {
    console.error("[HELP_CATEGORIES_GET_ERROR]", error)
    return c.json({ success: false, error: "Failed to fetch categories" }, 500)
  }
})

// Get single category (public)
app.get("/:id", async (c) => {
  try {
    const id = BigInt(c.req.param("id") as string)
    const category = await prisma.helpCategory.findUnique({
      where: { id },
      include: {
        topics: {
          orderBy: { order: "asc" }
        }
      }
    })

    if (!category) {
      return c.json({ success: false, error: "Category not found" }, 404)
    }

    const serialized = {
      ...category,
      id: String(category.id),
      topics: category.topics.map(topic => ({
        ...topic,
        id: String(topic.id),
        category_id: String(topic.category_id)
      }))
    }

    return c.json({ success: true, data: serialized })
  } catch (error) {
    console.error("[HELP_CATEGORY_GET_ERROR]", error)
    return c.json({ success: false, error: "Failed to fetch category" }, 500)
  }
})

// Create category (admin)
app.post(
  "/",
  requireAdmin,
  zValidator("json", helpCategorySchema),
  async (c) => {
    try {
      const body = c.req.valid("json")
      
      const category = await prisma.helpCategory.create({
        data: {
          title: body.title,
          slug: body.slug,
        }
      })

      return c.json({ 
        success: true, 
        data: { ...category, id: String(category.id) },
        message: "Category created successfully" 
      }, 201)
    } catch (error: any) {
      console.error("[HELP_CATEGORY_CREATE_ERROR]", error)
      if (error.code === 'P2002') {
        return c.json({ success: false, error: "A category with this slug already exists" }, 400)
      }
      return c.json({ success: false, error: "Failed to create category" }, 500)
    }
  }
)

// Update category (admin)
app.put(
  "/:id",
  requireAdmin,
  zValidator("json", helpCategorySchema),
  async (c) => {
    try {
      const id = BigInt(c.req.param("id") as string)
      const body = c.req.valid("json")
      
      const category = await prisma.helpCategory.update({
        where: { id },
        data: {
          title: body.title,
          slug: body.slug,
        }
      })

      return c.json({ 
        success: true, 
        data: { ...category, id: String(category.id) },
        message: "Category updated successfully" 
      })
    } catch (error: any) {
      console.error("[HELP_CATEGORY_UPDATE_ERROR]", error)
      if (error.code === 'P2025') {
        return c.json({ success: false, error: "Category not found" }, 404)
      }
      if (error.code === 'P2002') {
        return c.json({ success: false, error: "A category with this slug already exists" }, 400)
      }
      return c.json({ success: false, error: "Failed to update category" }, 500)
    }
  }
)

// Delete category (admin)
app.delete("/:id", requireAdmin, async (c) => {
  try {
    const id = BigInt(c.req.param("id") as string)
    
    await prisma.helpCategory.delete({
      where: { id }
    })

    return c.json({ success: true, message: "Category deleted successfully" })
  } catch (error: any) {
    console.error("[HELP_CATEGORY_DELETE_ERROR]", error)
    if (error.code === 'P2025') {
      return c.json({ success: false, error: "Category not found" }, 404)
    }
    return c.json({ success: false, error: "Failed to delete category" }, 500)
  }
})

export { app as helpCategoriesRouter }
