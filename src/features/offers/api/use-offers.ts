import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { Offer } from "../types/offer"

interface UseOffersParams {
  journalId?: string
  featured?: boolean
}

export const useOffers = (params?: UseOffersParams) => {
  return useQuery({
    queryKey: ["offers", params?.journalId, params?.featured],
    queryFn: async (): Promise<Offer[]> => {
      const query: Record<string, string> = {}
      if (params?.journalId) query.journal_id = params.journalId
      if (params?.featured !== undefined) query.is_featured = String(params.featured)

      const response = await client.offers.$get({ query })

      if (!response.ok) {
        throw new Error("Failed to fetch offers")
      }

      const json = await response.json()
      return json.data || []
    },
    staleTime: 60 * 1000, // 1 minute
  })
}
