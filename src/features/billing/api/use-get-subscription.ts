import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

export const useGetSubscription = () => {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await client.api.billing.subscription.$get()

      if (!response.ok) {
        throw new Error("Failed to fetch subscription")
      }

      const data = await response.json()
      return data || null
    },
    staleTime: 300000, // 5 minutes
  })
}
