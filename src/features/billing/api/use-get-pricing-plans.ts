import type { PricingPlan } from "@prisma/client"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { Serialized } from "@/src/lib/serialize"

export const useGetPricingPlans = () => {
  return useQuery({
    queryKey: ["pricing-plans"],
    queryFn: async () => {
      const response = await client.api.billing["pricing-plans"].$get()
      if (!response.ok) {
        throw new Error("Failed to fetch pricing plans")
      }
      const { data } = await response.json()
      return data as Serialized<PricingPlan>[]
    },
    staleTime: 300000, // 5 minutes
  })
}
