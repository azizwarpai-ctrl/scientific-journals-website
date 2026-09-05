import { z } from "zod"

export const billingIntervalEnum = z.enum(["one_time", "month", "year"])
export type BillingInterval = z.infer<typeof billingIntervalEnum>

export const relationIdSchema = z
  .union([
    z.string().trim().regex(/^\d+$/, { error: "ID must be a non-negative integer string" }),
    z.number().int({ error: "ID must be an integer" }).nonnegative({ error: "ID must be non-negative" }).safe({ error: "ID exceeds safe integer range" }),
  ])
  .nullable()
  .optional()

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
  available_from: z.iso.datetime().nullable().optional(),
  available_until: z.iso.datetime().nullable().optional(),
  pricing_plan_id: relationIdSchema,
  journal_id: relationIdSchema,
})

export const offerUpdateSchema = z.object({
  name: z.string().trim().min(1, { error: "Name cannot be empty" }).max(255).optional(),
  slug: z
    .string()
    .trim()
    .min(1, { error: "Slug cannot be empty" })
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      error: "Slug must be lowercase alphanumeric with hyphens (e.g. basic-plan)",
    })
    .optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  price_cents: z.coerce.number().int().nonnegative().optional(),
  currency: z
    .string()
    .trim()
    .length(3, { error: "Currency must be a 3-letter ISO code" })
    .regex(/^[A-Z]{3}$/, { error: "Currency must be uppercase (e.g. USD, EUR)" })
    .optional(),
  billing_interval: billingIntervalEnum.optional(),
  features: z
    .array(z.string().trim().min(1, { error: "Feature item cannot be empty" }))
    .min(1, { error: "At least one feature is required" })
    .optional(),
  icon_key: z.string().trim().max(100).nullable().optional(),
  image_url: z.string().trim().max(500).nullable().optional(),
  cta_text: z.string().trim().min(1).max(100).optional(),
  cta_url: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  available_from: z.iso.datetime().nullable().optional(),
  available_until: z.iso.datetime().nullable().optional(),
  pricing_plan_id: relationIdSchema,
  journal_id: relationIdSchema,
})

const MAX_SAFE_BIGINT = BigInt("9223372036854775807")
const ZERO_BIGINT = BigInt(0)

export const offerIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^\d+$/, { error: "Invalid offer ID" })
    .refine(
      (val) => {
        try {
          const b = BigInt(val)
          return b >= ZERO_BIGINT && b <= MAX_SAFE_BIGINT
        } catch {
          return false
        }
      },
      { error: "Offer ID out of range" }
    ),
})

export const offerLookupParamSchema = z.object({
  id: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (/^\d+$/.test(val)) {
          try {
            const b = BigInt(val)
            return b >= ZERO_BIGINT && b <= MAX_SAFE_BIGINT
          } catch {
            return false
          }
        }
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)
      },
      { error: "Invalid offer ID or slug" }
    ),
})

export const offerToggleSchema = z.object({
  is_active: z.boolean().optional(),
})

export const offerReorderSchema = z.object({
  sort_order: z.coerce.number().int(),
})

export const offerQuerySchema = z.object({
  journal_id: z
    .string()
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(
      z
        .string()
        .regex(/^\d+$/, { error: "Journal ID must be a non-negative integer" })
        .optional()
    )
    .optional(),
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
