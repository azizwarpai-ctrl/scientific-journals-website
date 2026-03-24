import { z } from "zod"

// ── Checkout ─────────────────────────────────────────────
export const checkoutSchema = z.object({
  pricingPlanId: z.coerce.number().int().positive(),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>

// ── Pricing Plan CRUD ────────────────────────────────────
export const pricingPlanCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().nonnegative(),
  features: z.record(z.string(), z.boolean()).optional(),
  stripePriceId: z.string().max(255).optional(),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
})
export type PricingPlanCreateInput = z.infer<typeof pricingPlanCreateSchema>

export const pricingPlanUpdateSchema = pricingPlanCreateSchema.partial()
export type PricingPlanUpdateInput = z.infer<typeof pricingPlanUpdateSchema>

export const pricingPlanIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
