import { z } from "zod"

export const aboutItemSchema = z.object({
  id: z.string().or(z.number()).optional(),
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  icon: z.string().trim().optional().nullable(),
  color_theme: z.string().trim().optional().nullable(),
  display_order: z.number().int().default(0),
})

export const aboutSectionSchema = z.object({
  id: z.string().or(z.number()).optional(),
  block_type: z.enum(["HERO", "TEXT", "CARDS", "GRID", "STATS"]),
  title: z.string().trim().optional().nullable(),
  subtitle: z.string().trim().optional().nullable(),
  content: z.string().trim().optional().nullable(),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  items: z.array(aboutItemSchema).default([]),
})

export type AboutItem = z.infer<typeof aboutItemSchema>
export type AboutSection = z.infer<typeof aboutSectionSchema>

export const reorderAboutSectionsSchema = z.object({
  sections: z.array(z.object({
    id: z.string().or(z.number()),
    display_order: z.number().int(),
  })),
})
