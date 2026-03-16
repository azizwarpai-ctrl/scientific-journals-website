import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/lib/db/config"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { aboutContentSchema, defaultAboutContent, type AboutContent } from "../schema"

const SETTING_KEY = "about_page_content"

export const aboutRouter = new Hono()
  .get("/", async (c) => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { setting_key: SETTING_KEY }
      })

      if (!setting) {
        return c.json({ data: defaultAboutContent })
      }

      // Validate the persisted value
      const parsed = aboutContentSchema.safeParse(setting.setting_value)
      if (!parsed.success) {
        console.error("[ABOUT_GET_VALIDATION_ERROR]", parsed.error)
        // Fallback to default if corrupted
        return c.json({ data: defaultAboutContent })
      }

      return c.json({ data: parsed.data })
    } catch (error) {
      console.error("[ABOUT_GET_ERROR]", error)
      return c.json({ error: "Failed to fetch about content" }, 500)
    }
  })
  .put(
    "/",
    requireAdmin,
    zValidator("json", aboutContentSchema),
    async (c) => {
      try {
        const body = c.req.valid("json")
        
        const setting = await prisma.systemSetting.upsert({
          where: { setting_key: SETTING_KEY },
          update: { setting_value: body as any },
          create: {
            setting_key: SETTING_KEY,
            setting_value: body as any,
            description: "Dynamic content for the About page"
          }
        })

        const data = setting.setting_value as unknown as AboutContent
        return c.json({ data })
      } catch (error) {
        console.error("[ABOUT_UPDATE_ERROR]", error)
        return c.json({ error: "Failed to update about content" }, 500)
      }
    }
  )
