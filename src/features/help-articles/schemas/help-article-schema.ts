import { z } from "zod"

const baseHelpArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Content is required").max(50000),
  category: z.string().max(100).optional(),
  icon: z.string().max(100).optional(),
  display_order: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
})

export const helpArticleCreateSchema = baseHelpArticleSchema.extend({
  category: z.string().max(100).optional().default("general"),
  display_order: z.number().int().min(0).optional().default(0),
  is_published: z.boolean().optional().default(false),
})

export const helpArticleUpdateSchema = baseHelpArticleSchema.partial()

export const helpArticleIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid Help Article ID"),
})

export type HelpArticleCreate = z.infer<typeof helpArticleCreateSchema>
export type HelpArticleUpdate = z.infer<typeof helpArticleUpdateSchema>
