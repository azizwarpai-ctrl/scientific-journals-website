import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/src/lib/db/config"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { aboutSectionSchema, reorderAboutSectionsSchema } from "../schema"

export const aboutRouter = new Hono()
  .get("/", async (c) => {
    try {
      const sections = await prisma.aboutSection.findMany({
        where: { is_active: true },
        include: {
          items: {
            orderBy: { display_order: "asc" }
          }
        },
        orderBy: { display_order: "asc" }
      })

      // Convert BigInt IDs to string for JSON serialization
      const serializedSections = sections.map(section => ({
        ...section,
        id: section.id.toString(),
        items: section.items.map(item => ({
          ...item,
          id: item.id.toString(),
          section_id: item.section_id.toString()
        }))
      }))

      return c.json({ data: serializedSections })
    } catch (error) {
      console.error("[ABOUT_GET_ERROR]", error)
      return c.json({ error: "Failed to fetch about content" }, 500)
    }
  })
  .get("/admin", requireAdmin, async (c) => {
    try {
      const sections = await prisma.aboutSection.findMany({
        include: {
          items: {
            orderBy: { display_order: "asc" }
          }
        },
        orderBy: { display_order: "asc" }
      })

      const serializedSections = sections.map(section => ({
        ...section,
        id: section.id.toString(),
        items: section.items.map(item => ({
          ...item,
          id: item.id.toString(),
          section_id: item.section_id.toString()
        }))
      }))

      return c.json({ data: serializedSections })
    } catch (error) {
      console.error("[ABOUT_ADMIN_GET_ERROR]", error)
      return c.json({ error: "Failed to fetch about content" }, 500)
    }
  })
  .post(
    "/",
    requireAdmin,
    zValidator("json", aboutSectionSchema),
    async (c) => {
      try {
        const body = c.req.valid("json")
        
        const section = await prisma.aboutSection.create({
          data: {
            block_type: body.block_type,
            title: body.title,
            subtitle: body.subtitle,
            content: body.content,
            display_order: body.display_order,
            is_active: body.is_active,
            items: {
              create: body.items?.map(i => ({
                title: i.title,
                description: i.description,
                icon: i.icon,
                color_theme: i.color_theme,
                display_order: i.display_order,
              })) || []
            }
          },
          include: { items: true }
        })

        return c.json({ data: { ...section, id: section.id.toString(), items: section.items.map(i => ({...i, id: i.id.toString(), section_id: i.section_id.toString()})) } })
      } catch (error) {
        console.error("[ABOUT_CREATE_ERROR]", error)
        return c.json({ error: "Failed to create about section" }, 500)
      }
    }
  )
  .put(
    "/:id",
    requireAdmin,
    zValidator("json", aboutSectionSchema),
    async (c) => {
      try {
        const idString = c.req.param("id")
        if (!idString) return c.json({ error: "Missing ID" }, 400)
        const id = BigInt(idString)
        const body = c.req.valid("json")
        
        // We will process updating items by deleting existing, and creating new ones.
        await prisma.aboutItem.deleteMany({
          where: { section_id: id }
        })

        const section = await prisma.aboutSection.update({
          where: { id },
          data: {
            block_type: body.block_type,
            title: body.title,
            subtitle: body.subtitle,
            content: body.content,
            display_order: body.display_order,
            is_active: body.is_active,
            items: {
              create: body.items?.map(i => ({
                title: i.title,
                description: i.description,
                icon: i.icon,
                color_theme: i.color_theme,
                display_order: i.display_order,
              })) || []
            }
          },
          include: { items: true }
        })

        return c.json({ data: { ...section, id: section.id.toString(), items: section.items.map(i => ({...i, id: i.id.toString(), section_id: i.section_id.toString()})) } })
      } catch (error) {
        console.error("[ABOUT_UPDATE_ERROR]", error)
        return c.json({ error: "Failed to update about section" }, 500)
      }
    }
  )
  .delete(
    "/:id",
    requireAdmin,
    async (c) => {
      try {
        const idString = c.req.param("id")
        if (!idString) return c.json({ error: "Missing ID" }, 400)
        const id = BigInt(idString)
        
        await prisma.aboutSection.delete({
          where: { id }
        })

        return c.json({ success: true })
      } catch (error) {
        console.error("[ABOUT_DELETE_ERROR]", error)
        return c.json({ error: "Failed to delete about section" }, 500)
      }
    }
  )
  .post(
    "/reorder",
    requireAdmin,
    zValidator("json", reorderAboutSectionsSchema),
    async (c) => {
      try {
        const { sections } = c.req.valid("json")
        
        await prisma.$transaction(
          sections.map(s => 
            prisma.aboutSection.update({
              where: { id: BigInt(s.id) },
              data: { display_order: s.display_order }
            })
          )
        )

        return c.json({ success: true })
      } catch (error) {
        console.error("[ABOUT_REORDER_ERROR]", error)
        return c.json({ error: "Failed to reorder about sections" }, 500)
      }
    }
  )
