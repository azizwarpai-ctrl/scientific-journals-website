import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export const useCreatePortal = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await client.api.billing.portal.$post()

      if (!response.ok) {
        throw new Error("Failed to create portal session")
      }

      return await response.json()
    },
    onError: () => {
      toast.error("Failed to open billing portal")
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
  })
}
