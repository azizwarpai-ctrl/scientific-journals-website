import { z } from "zod"

export const realSolutionCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  icon: z.string().max(100).optional(),
  features: z.array(z.string()).optional(),
  display_order: z.number().int().optional().default(0),
  is_published: z.boolean().optional().default(false),
})

export const realSolutionUpdateSchema = realSolutionCreateSchema.partial()

export const realSolutionIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid solution ID"),
})

export const REAL_SOLUTION_SELECT = {
  id: true,
  title: true,
  description: true,
  icon: true,
  features: true,
  display_order: true,
  is_published: true,
  created_at: true,
  updated_at: true,
} as const

export type RealSolutionCreate = z.infer<typeof realSolutionCreateSchema>
export type RealSolutionUpdate = z.infer<typeof realSolutionUpdateSchema>
