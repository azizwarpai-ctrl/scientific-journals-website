import type { OfferCreateInput, OfferUpdateInput, BillingInterval } from "../schemas/offer-schema"

export type { OfferCreateInput, OfferUpdateInput, BillingInterval }

export interface OfferPricingPlanInfo {
  id: string
  name: string
  price: number | string
  stripe_price_id: string | null
}

export interface OfferJournalInfo {
  id: string
  title: string
}

export interface Offer {
  id: string
  name: string
  slug: string
  description: string | null
  price_cents: number
  currency: string
  billing_interval: BillingInterval
  features: string[]
  icon_key: string | null
  image_url: string | null
  cta_text: string
  cta_url: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  available_from: string | null
  available_until: string | null
  pricing_plan_id: string | null
  journal_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  pricing_plan?: OfferPricingPlanInfo | null
  journal?: OfferJournalInfo | null
}

export interface OfferPublic {
  id: string
  name: string
  slug: string
  description: string | null
  price_cents: number
  currency: string
  billing_interval: BillingInterval
  features: string[]
  icon_key: string | null
  image_url: string | null
  cta_text: string
  cta_url: string | null
  is_featured: boolean
  sort_order: number
  available_from: string | null
  available_until: string | null
  pricing_plan_id: string | null
  journal_id: string | null
  pricing_plan?: OfferPricingPlanInfo | null
  journal?: OfferJournalInfo | null
}
