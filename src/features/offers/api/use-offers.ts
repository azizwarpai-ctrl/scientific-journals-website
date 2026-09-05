import { useQuery } from "@tanstack/react-query"
import type { Offer } from "../types/offer"

interface UseOffersParams {
  journalId?: string
  featured?: boolean
}

export const useOffers = (params?: UseOffersParams) => {
  return useQuery({
    queryKey: ["offers", params?.journalId, params?.featured],
    queryFn: async (): Promise<Offer[]> => {
      const searchParams = new URLSearchParams()
      if (params?.journalId) searchParams.set("journal_id", params.journalId)
      if (params?.featured !== undefined) searchParams.set("is_featured", String(params.featured))

      const url = `/api/offers${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch offers")
      }

      const json = await response.json()
      return (json.data || []) as Offer[]
    },
    staleTime: 60 * 1000, // 1 minute
  })
}
