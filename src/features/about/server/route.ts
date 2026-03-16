import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { prisma } from "@/lib/db/config"

export const aboutContentSchema = z.object({
  heroTitle: z.string().min(1),
  heroSubtitle: z.string().min(1),
  missionText: z.string().min(1),
  visionText: z.string().min(1),
  whoWeAreText: z.string().min(1),
  brandPhilosophyText: z.string().min(1),
})

export type AboutContent = z.infer<typeof aboutContentSchema>

const SETTING_KEY = "about_page_content"

export const defaultAboutContent: AboutContent = {
  heroTitle: "About dis",
  heroSubtitle: "Redefining the future of academic publishing through seamless digital integration and innovation",
  missionText: "To empower journals, editors, and researchers worldwide with comprehensive digital publishing solutions that uphold the highest standards of transparency, quality, and ethical scholarly communication. We bridge the gap between research creation, dissemination, and long-term preservation.",
  visionText: "To create a vibrant ecosystem where science and technology evolve in harmony, fostering a trusted environment where scholarly work can thrive. We envision a future where every researcher has access to world-class publishing tools and global reach.",
  whoWeAreText: "At dis, we redefine the future of academic publishing through seamless digital integration and innovation. As a forward-thinking scientific publisher, we provide a comprehensive suite of digital publishing and management solutions designed to empower journals, editors, and researchers worldwide.\n\nOur services include e-journal platform solutions for journal creation, hosting, and management; SubmitManager, our intuitive e-submission platform; and end-to-end e-editorial and e-review systems that streamline every stage of scholarly communication.\n\nBeyond these core services, we offer CrossRef integration (DOI, Crossmark, Similarity Check), XML and LaTeX production, ORCID author identification, citation metrics, indexing, and archiving solutions through Portico and CLOCKSS—ensuring every publication meets the highest international standards of accessibility and integrity.",
  brandPhilosophyText: "Our visual branding reflects our philosophy of digital growth and intellectual connectivity. The dis identity—featuring gradient blue and slate tones—symbolizes the organic growth of knowledge rooted in technological innovation.\n\nThe color palette represents the interconnection of ideas, researchers, and data. The dual-tone of deep blue and cool slate conveys both academic reliability and forward-looking creativity. Together, they capture our vision: a vibrant ecosystem where science and technology evolve in harmony to advance open, ethical, and impactful scholarly communication."
}

export const aboutRouter = new Hono()
  .get("/", async (c) => {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { setting_key: SETTING_KEY }
      })

      if (!setting) {
        return c.json({ data: defaultAboutContent })
      }

      // Parse JSON from the DB
      const data = setting.setting_value as unknown as AboutContent
      return c.json({ data })
    } catch (error) {
      console.error("[ABOUT_GET_ERROR]", error)
      return c.json({ error: "Failed to fetch about content" }, 500)
    }
  })
  .put(
    "/",
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

        return c.json({ data: setting.setting_value as unknown as AboutContent })
      } catch (error) {
        console.error("[ABOUT_UPDATE_ERROR]", error)
        return c.json({ error: "Failed to update about content" }, 500)
      }
    }
  )
