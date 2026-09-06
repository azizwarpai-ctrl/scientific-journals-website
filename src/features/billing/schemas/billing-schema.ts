import { z } from "zod"

// ── Shared unsigned decimal-string / positive numeric ID ──────
export const unsignedDecimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+$/.test(v) && BigInt(v) > BigInt(0), {
    message: "Must be a positive numeric ID",
  })

// ── Checkout ─────────────────────────────────────────────
export const checkoutSchema = z.object({
  pricingPlanId: unsignedDecimalStringSchema.transform((v) => Number(v)),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>

// ── Shared ID param ──────────────────────────────────────
export const pricingPlanIdParamSchema = z.object({
  id: unsignedDecimalStringSchema,
})

export const pricingPlanSlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (e.g. basic-author-package)"),
})

// ── Public query params ──────────────────────────────────
export const pricingPlanPublicQuerySchema = z.object({
  journal_id: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined && v !== null ? String(v).trim() : undefined))
    .refine((v) => v === undefined || (/^\d+$/.test(v) && BigInt(v) > BigInt(0)), {
      message: "journal_id must be a positive numeric ID",
    })
    .transform((v) => (v ? BigInt(v) : undefined)),
  active_only: z.enum(["true", "false"]).optional().default("true"),
})

// ── Features schema ───────────────────────────────────────
// Accepts either Record<string, boolean> (as used in admin form and pricing table)
// or string[] (clean list of feature bullets)
export const featuresSchema = z.union([
  z.record(z.string(), z.boolean()),
  z.array(z.string()),
])

// ── Pricing Plan CREATE ───────────────────────────────────
export const pricingPlanCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (e.g. basic-author-package)")
    .optional(),
  description: z.string().max(5000).optional(),
  short_description: z.string().max(500).optional(),
  price: z.coerce.number().nonnegative("Price must be non-negative"),
  currency: z.string().length(3).default("USD").optional(),
  billing_interval: z.string().max(20).default("one_time").optional(),
  features: featuresSchema.optional().default({}),
  icon_key: z.string().max(50).optional(),
  image_url: z.string().max(500).optional(),
  cta_label: z.string().min(1).max(100).default("Get Started").optional(),
  cta_url: z.string().max(500).optional(),
  stripePriceId: z.string().max(255).optional(),
  stripe_price_id: z.string().max(255).optional(),
  isActive: z.boolean().default(true).optional(),
  is_active: z.boolean().optional(),
  isPopular: z.boolean().default(false).optional(),
  is_popular: z.boolean().optional(),
  is_featured: z.boolean().default(false).optional(),
  sort_order: z.number().int().default(0).optional(),
  available_from: z.iso.datetime().optional(),
  available_until: z.iso.datetime().optional(),
  journal_id: z
    .union([z.string(), z.number()])
    .optional(),
})
export type PricingPlanCreateInput = z.infer<typeof pricingPlanCreateSchema>

// ── Plan Form Schema (client-side, react-hook-form) ──────────────────────────
// Uses string[] for features (FeatureListEditor always produces string[])
// so react-hook-form can infer types without the union type incompatibility.
export const planFormSchema = pricingPlanCreateSchema.extend({
  features: z.array(z.string()).default([]),
})
export type PlanFormValues = z.infer<typeof planFormSchema>

// ── Pricing Plan UPDATE ───────────────────────────────────
// Defined independently without defaults so partial PATCH updates do not
// overwrite omitted fields with default values.
export const pricingPlanUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (e.g. basic-author-package)")
    .optional(),
  description: z.string().max(5000).optional(),
  short_description: z.string().max(500).optional(),
  price: z.coerce.number().nonnegative("Price must be non-negative").optional(),
  currency: z.string().length(3).optional(),
  billing_interval: z.string().max(20).optional(),
  features: featuresSchema.optional(),
  icon_key: z.string().max(50).optional(),
  image_url: z.string().max(500).optional(),
  cta_label: z.string().min(1).max(100).optional(),
  cta_url: z.string().max(500).optional(),
  stripePriceId: z.string().max(255).optional(),
  stripe_price_id: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  is_popular: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  available_from: z.iso.datetime().optional(),
  available_until: z.iso.datetime().optional(),
  journal_id: z.union([z.string(), z.number()]).optional(),
})
export type PricingPlanUpdateInput = z.infer<typeof pricingPlanUpdateSchema>

// ── Toggle / Reorder ──────────────────────────────────────
export const pricingPlanToggleSchema = z.object({
  is_active: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
export type PricingPlanToggleInput = z.infer<typeof pricingPlanToggleSchema>

export const pricingPlanReorderSchema = z.object({
  sort_order: z.number().int(),
})
export type PricingPlanReorderInput = z.infer<typeof pricingPlanReorderSchema>
