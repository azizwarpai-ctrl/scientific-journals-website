import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { Offer } from "../types/offer"

export const useOffer = (idOrSlug: string) => {
  return useQuery({
    queryKey: ["offer", idOrSlug],
    queryFn: async (): Promise<Offer> => {
      const response = await client.offers[":id"].$get({
        param: { id: idOrSlug },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Offer not found")
        }
        throw new Error("Failed to fetch offer")
      }

      const json = await response.json()
      return json.data
    },
    enabled: Boolean(idOrSlug),
    staleTime: 60 * 1000,
  })
}
