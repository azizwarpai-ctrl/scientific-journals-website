import { z } from "zod"

export const faqCreateSchema = z.object({
  question: z.string().min(1, "Question is required").max(1000),
  answer: z.string().min(1, "Answer is required").max(10000),
  category: z.string().max(100).optional().default("general"),
  is_published: z.boolean().optional().default(false),
})

export const faqUpdateSchema = faqCreateSchema.partial()

export const faqIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid FAQ ID"),
})

export type FaqCreate = z.infer<typeof faqCreateSchema>
export type FaqUpdate = z.infer<typeof faqUpdateSchema>
