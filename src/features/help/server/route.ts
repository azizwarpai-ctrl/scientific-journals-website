import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/src/lib/db/config"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { helpContentSchema, defaultHelpContent, type HelpContent } from "../schemas/help-schema"

const SETTING_KEY = "help_page_content"

export const helpRouter = new Hono()
  .get("/", async (c) => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { setting_key: SETTING_KEY }
      })

      if (!setting) {
        return c.json({ data: defaultHelpContent })
      }

      // Validate the persisted value
      const parsed = helpContentSchema.safeParse(setting.setting_value)
      if (!parsed.success) {
        console.error("[HELP_GET_VALIDATION_ERROR]", parsed.error)
        // Fallback to default if corrupted
        return c.json({ data: defaultHelpContent })
      }

      return c.json({ data: parsed.data })
    } catch (error) {
      console.error("[HELP_GET_ERROR]", error)
      return c.json({ error: "Failed to fetch help content" }, 500)
    }
  })
  .put(
    "/",
    requireAdmin,
    zValidator("json", helpContentSchema),
    async (c) => {
      try {
        const body = c.req.valid("json")
        
        const setting = await prisma.systemSetting.upsert({
          where: { setting_key: SETTING_KEY },
          update: { setting_value: body as any },
          create: {
            setting_key: SETTING_KEY,
            setting_value: body as any,
            description: "Dynamic content for the Help page, including Author and Reviewer guides."
          }
        })

        const data = setting.setting_value as unknown as HelpContent
        return c.json({ data })
      } catch (error) {
        console.error("[HELP_UPDATE_ERROR]", error)
        return c.json({ error: "Failed to update help content" }, 500)
      }
    }
  )
