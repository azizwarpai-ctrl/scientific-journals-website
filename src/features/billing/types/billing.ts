import type { z } from "zod"
import type {
  pricingPlanCreateSchema,
  pricingPlanUpdateSchema,
  pricingPlanToggleSchema,
  pricingPlanReorderSchema,
} from "../schemas/billing-schema"

export type PricingPlanCreateInput = z.infer<typeof pricingPlanCreateSchema>
export type PricingPlanUpdateInput = z.infer<typeof pricingPlanUpdateSchema>
export type PricingPlanToggleInput = z.infer<typeof pricingPlanToggleSchema>
export type PricingPlanReorderInput = z.infer<typeof pricingPlanReorderSchema>

export type BillingInterval = "one_time" | "month" | "year" | string

export interface PricingPlanPublic {
  id: string
  name: string
  slug: string | null
  description: string | null
  short_description: string | null
  price: number | string
  currency: string
  billing_interval: string
  features: string[] | Record<string, boolean> | null
  icon_key: string | null
  image_url: string | null
  cta_label: string
  cta_url: string | null
  is_active: boolean
  is_featured: boolean
  is_popular: boolean
  sort_order: number
  available_from: string | null
  available_until: string | null
  journal_id: string | null
  stripe_price_id: string | null
  created_at: string
  updated_at: string
}
