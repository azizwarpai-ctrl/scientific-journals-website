import { z } from "zod"

export const messageCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address").max(255),
  subject: z.string().min(1, "Subject is required").max(255),
  message: z.string().min(1, "Message is required").max(5000),
  message_type: z
    .enum(["general", "submission_help", "technical_support", "editorial", "partnership", "other"])
    .optional()
    .default("general"),
})

export const messageUpdateSchema = z.object({
  status: z.enum(["unread", "read", "replied", "archived"]).optional(),
})

export const messageIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Invalid message ID"),
})

export type MessageCreate = z.infer<typeof messageCreateSchema>
export type MessageUpdate = z.infer<typeof messageUpdateSchema>
