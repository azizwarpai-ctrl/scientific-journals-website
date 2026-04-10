import { z } from "zod"

export const quickLinkSchema = z.object({
  id: z.string().optional(),
  icon: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  href: z.string().trim().min(1),
  color: z.enum(["primary", "secondary"]).default("primary"),
})

export const helpContentSchema = z.object({
  heroTitle: z.string().trim().min(1),
  heroSubtitle: z.string().trim().min(1),
  quickLinks: z.array(quickLinkSchema).default([]),
})

export type HelpContent = z.infer<typeof helpContentSchema>
export type QuickLink = z.infer<typeof quickLinkSchema>

export const defaultHelpContent: HelpContent = {
  heroTitle: "Help Center",
  heroSubtitle: "Find answers, guides and support for your publishing journey",
  quickLinks: [
    { id: "1", icon: "BookOpen", title: "Guide for Authors", description: "Submission guidelines & requirements", href: "#guide-authors", color: "primary" },
    { id: "2", icon: "Users", title: "Guide for Reviewers", description: "Review process & expectations", href: "#guide-reviewers", color: "secondary" },
    { id: "3", icon: "FileText", title: "Submission Help", description: "Get help with your manuscript", href: "/help/submission-service", color: "primary" },
    { id: "4", icon: "HelpCircle", title: "Technical Support", description: "Report technical issues", href: "/help/technical-support", color: "secondary" },
  ],
}
