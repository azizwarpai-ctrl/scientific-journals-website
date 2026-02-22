import { z } from "zod"

export const journalCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  abbreviation: z.string().max(100).optional().nullable(),
  issn: z.string().max(20).optional().nullable(),
  e_issn: z.string().max(20).optional().nullable(),
  description: z.string().optional().nullable(),
  field: z.string().min(1, "Field is required").max(100),
  publisher: z.string().max(255).optional().nullable(),
  editor_in_chief: z.string().max(255).optional().nullable(),
  frequency: z.string().max(50).optional().nullable(),
  submission_fee: z.coerce.number().nonnegative().optional().default(0),
  publication_fee: z.coerce.number().nonnegative().optional().default(0),
  cover_image_url: z.string().url().optional().nullable(),
  website_url: z.string().url().optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]).optional().default("active"),
})

export const journalUpdateSchema = journalCreateSchema.partial()

export const journalIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid journal ID"),
})

export type JournalCreate = z.infer<typeof journalCreateSchema>
export type JournalUpdate = z.infer<typeof journalUpdateSchema>
