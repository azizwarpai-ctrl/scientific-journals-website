import { z } from "zod"

export const helpCategorySchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
})

export type HelpCategoryFormValues = z.infer<typeof helpCategorySchema>

export const helpTopicSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export type HelpTopicFormValues = z.infer<typeof helpTopicSchema>

