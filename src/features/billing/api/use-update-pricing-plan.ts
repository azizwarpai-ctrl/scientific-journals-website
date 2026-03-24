import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { z } from "zod"
import { pricingPlanUpdateSchema } from "@/src/features/billing/schemas/billing-schema"

type UpdatePricingPlanPayload = z.infer<typeof pricingPlanUpdateSchema>

export const useUpdatePricingPlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePricingPlanPayload }) => {
      const response = await client.api.billing["pricing-plans"][":id"].$patch({
        param: { id },
        json: data,
      })

      if (!response.ok) {
        throw new Error("Failed to update pricing plan")
      }

      return await response.json()
    },
    onSuccess: () => {
      toast.success("Pricing plan updated successfully")
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] })
    },
    onError: () => {
      toast.error("Failed to update pricing plan")
    },
  })
}
