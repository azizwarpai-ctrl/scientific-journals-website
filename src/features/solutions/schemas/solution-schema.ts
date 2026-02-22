import { z } from "zod"

export const solutionCreateSchema = z.object({
  question: z.string().min(1, "Question is required").max(1000),
  answer: z.string().min(1, "Answer is required").max(10000),
  category: z.string().max(100).optional().default("general"),
  is_published: z.boolean().optional().default(false),
})

export const solutionUpdateSchema = solutionCreateSchema.partial()

export const solutionIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid solution ID"),
})

export type SolutionCreate = z.infer<typeof solutionCreateSchema>
export type SolutionUpdate = z.infer<typeof solutionUpdateSchema>
