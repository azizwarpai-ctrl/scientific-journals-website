import type { PricingPlan } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { Serialized } from "@/src/lib/serialize"

export type SerializedPricingPlan = Serialized<PricingPlan>

/**
 * Fetches active, time-valid PricingPlans for public consumption.
 * Optionally filtered by journal_id.
 */
export const usePricingPlans = (journalId?: string) => {
  return useQuery({
    queryKey: ["pricing-plans", journalId],
    queryFn: async () => {
      const query = journalId ? { journal_id: journalId } : {}
      const response = await client.billing.plans.$get({ query })
      if (!response.ok) {
        throw new Error("Failed to fetch pricing plans")
      }
      const json = await response.json()
      return (json as { success: boolean; data: SerializedPricingPlan[] }).data
    },
    staleTime: 300_000, // 5 minutes
  })
}

/**
 * Fetches a single active PricingPlan by its numeric id.
 */
export const usePricingPlan = (id?: string) => {
  return useQuery({
    queryKey: ["pricing-plan", id],
    queryFn: async () => {
      const response = await client.billing.plans[":id"].$get({ param: { id: id! } })
      if (!response.ok) {
        throw new Error("Failed to fetch pricing plan")
      }
      const json = await response.json()
      return (json as { success: boolean; data: SerializedPricingPlan }).data
    },
    enabled: !!id,
    staleTime: 300_000,
  })
}

/**
 * Fetches a single active PricingPlan by its slug.
 */
export const usePricingPlanBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["pricing-plan-slug", slug],
    queryFn: async () => {
      const response = await client.billing.plans.slug[":slug"].$get({
        param: { slug: slug! },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch pricing plan by slug")
      }
      const json = await response.json()
      return (json as { success: boolean; data: SerializedPricingPlan }).data
    },
    enabled: !!slug,
    staleTime: 300_000,
  })
}

// Kept for backwards compatibility
export const useGetPricingPlans = usePricingPlans
