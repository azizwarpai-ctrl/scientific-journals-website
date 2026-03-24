import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { z } from "zod"
import { pricingPlanCreateSchema } from "@/src/features/billing/schemas/billing-schema"

type CreatePricingPlanPayload = z.infer<typeof pricingPlanCreateSchema>

export const useCreatePricingPlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (json: CreatePricingPlanPayload) => {
      const response = await client.api.billing["pricing-plans"].$post({ json })

      if (!response.ok) {
        throw new Error("Failed to create pricing plan")
      }

      return await response.json()
    },
    onSuccess: () => {
      toast.success("Pricing plan created successfully")
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] })
    },
    onError: () => {
      toast.error("Failed to create pricing plan")
    },
  })
}
