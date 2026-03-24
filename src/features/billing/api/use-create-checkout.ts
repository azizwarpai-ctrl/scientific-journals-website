import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export const useCreateCheckout = () => {
  const mutation = useMutation({
    mutationFn: async ({ pricingPlanId }: { pricingPlanId: number }) => {
      const response = await client.api.billing.checkout.$post({
        json: { pricingPlanId },
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      return await response.json()
    },
    onError: () => {
      toast.error("Failed to start checkout process")
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
  })

  return mutation
}
