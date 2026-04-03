import { Hono } from "hono"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"

const app = new Hono()

app.get("/", async (c) => {
  try {
    const issueSettings = await ojsQuery("SELECT DISTINCT setting_name FROM issue_settings WHERE setting_name LIKE '%cover%'")
    const isCovers = await ojsQuery("SELECT * FROM issue_settings WHERE setting_name = 'coverImage' LIMIT 5")
    
    const pubSettings = await ojsQuery("SELECT DISTINCT setting_name FROM publication_settings WHERE setting_name LIKE '%cover%'")
    const pubCovers = await ojsQuery("SELECT * FROM publication_settings WHERE setting_name = 'coverImage' LIMIT 5")
    
    return c.json({ issueSettings, isCovers, pubSettings, pubCovers })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

export default app
