import { z } from "zod"

export const billingIntervalEnum = z.enum(["one_time", "month", "year"])
export type BillingInterval = z.infer<typeof billingIntervalEnum>

export const offerCreateSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required" }).max(255),
  slug: z
    .string()
    .trim()
    .min(1, { error: "Slug is required" })
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      error: "Slug must be lowercase alphanumeric with hyphens (e.g. basic-plan)",
    }),
  description: z.string().trim().max(1000).nullable().optional(),
  price_cents: z.coerce.number().int().nonnegative().default(0),
  currency: z
    .string()
    .trim()
    .length(3, { error: "Currency must be a 3-letter ISO code" })
    .regex(/^[A-Z]{3}$/, { error: "Currency must be uppercase (e.g. USD, EUR)" })
    .default("USD"),
  billing_interval: billingIntervalEnum.default("month"),
  features: z
    .array(z.string().trim().min(1, { error: "Feature item cannot be empty" }))
    .min(1, { error: "At least one feature is required" }),
  icon_key: z.string().trim().max(100).nullable().optional(),
  image_url: z.string().trim().max(500).nullable().optional(),
  cta_text: z.string().trim().min(1).max(100).default("Get Started"),
  cta_url: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
  available_from: z.string().datetime().nullable().optional(),
  available_until: z.string().datetime().nullable().optional(),
  pricing_plan_id: z.union([z.string(), z.number()]).nullable().optional(),
  journal_id: z.union([z.string(), z.number()]).nullable().optional(),
})

export const offerUpdateSchema = offerCreateSchema.partial()

export const offerIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, { error: "Invalid offer ID" }),
})

export const offerToggleSchema = z.object({
  is_active: z.boolean().optional(),
})

export const offerReorderSchema = z.object({
  sort_order: z.coerce.number().int(),
})

export const offerQuerySchema = z.object({
  journal_id: z.string().optional(),
  is_active: z.enum(["true", "false"]).optional(),
  is_featured: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

export const OFFER_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price_cents: true,
  currency: true,
  billing_interval: true,
  features: true,
  icon_key: true,
  image_url: true,
  cta_text: true,
  cta_url: true,
  is_active: true,
  is_featured: true,
  sort_order: true,
  available_from: true,
  available_until: true,
  pricing_plan_id: true,
  journal_id: true,
  created_by: true,
  created_at: true,
  updated_at: true,
  pricing_plan: {
    select: {
      id: true,
      name: true,
      price: true,
      stripe_price_id: true,
    },
  },
  journal: {
    select: {
      id: true,
      title: true,
    },
  },
} as const

export type OfferCreateInput = z.infer<typeof offerCreateSchema>
export type OfferUpdateInput = z.infer<typeof offerUpdateSchema>
export type OfferQueryParams = z.infer<typeof offerQuerySchema>
