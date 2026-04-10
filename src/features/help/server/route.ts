import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/src/lib/db/config"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { helpContentSchema, defaultHelpContent, type HelpContent } from "@/src/features/help/schemas/help-schema"

const SETTING_KEY = "help_page_content"

const app = new Hono()

app.get("/", async (c) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { setting_key: SETTING_KEY }
    })

    if (!setting) {
      return c.json({ success: true, data: defaultHelpContent }, 200)
    }

    // Validate the persisted value
    const parsed = helpContentSchema.safeParse(setting.setting_value)
    if (!parsed.success) {
      console.error("[HELP_GET_VALIDATION_ERROR]", parsed.error)
      // Fallback to default if corrupted
      return c.json({ success: true, data: defaultHelpContent }, 200)
    }

    return c.json({ success: true, data: parsed.data }, 200)
  } catch (error) {
    console.error("[HELP_GET_ERROR]", error)
    return c.json({ success: false, error: "Failed to fetch help content" }, 500)
  }
})

app.put(
  "/",
  requireAdmin,
  zValidator("json", helpContentSchema),
  async (c) => {
    try {
      const body = c.req.valid("json")
      
      const setting = await prisma.systemSetting.upsert({
        where: { setting_key: SETTING_KEY },
        update: { setting_value: body as unknown as import("@prisma/client").Prisma.InputJsonValue },
        create: {
          setting_key: SETTING_KEY,
          setting_value: body as unknown as import("@prisma/client").Prisma.InputJsonValue,
          description: "Dynamic content for the Help page, including Author and Reviewer guides."
        }
      })

      const data = setting.setting_value as unknown as HelpContent
      return c.json({ success: true, data, message: "Help content updated successfully" }, 200)
    } catch (error) {
      console.error("[HELP_UPDATE_ERROR]", error)
      return c.json({ success: false, error: "Failed to update help content" }, 500)
    }
  }
)

export { app as helpRouter }
