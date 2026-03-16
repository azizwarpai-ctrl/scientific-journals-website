import { z } from "zod"

export const emailTemplateCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .regex(/^[a-z0-9_-]+$/, "Name must be lowercase alphanumeric with hyphens/underscores"),
  subject: z.string().min(1, "Subject is required").max(500),
  html_content: z.string().min(1, "HTML content is required"),
  text_content: z.string().optional(),
  variables: z.array(z.string()).optional(),
  description: z.string().max(2000).optional(),
  is_active: z.boolean().optional().default(true),
})

export const emailTemplateUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .regex(/^[a-z0-9_-]+$/, "Name must be lowercase alphanumeric with hyphens/underscores")
    .optional(),
  subject: z.string().min(1).max(500).optional(),
  html_content: z.string().min(1).optional(),
  text_content: z.string().nullable().optional(),
  variables: z.array(z.string()).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
})

export const emailTemplateIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid template ID"),
})

export const emailTemplatePreviewSchema = z.object({
  variables: z.record(z.string(), z.string()).optional().default({}),
})

export const emailTemplateSendTestSchema = z.object({
  to: z.string().email("Invalid email address"),
  variables: z.record(z.string(), z.string()).optional().default({}),
})

export type EmailTemplateCreate = z.infer<typeof emailTemplateCreateSchema>
export type EmailTemplateUpdate = z.infer<typeof emailTemplateUpdateSchema>
