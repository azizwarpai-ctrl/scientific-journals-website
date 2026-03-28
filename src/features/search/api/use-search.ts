import { useQuery } from "@tanstack/react-query"
import type { SearchResponse } from "../schemas/search-schema"

export function useSearch(query: string, type: "all" | "journal" | "solution" | "faq" = "all") {
  return useQuery<SearchResponse>({
    queryKey: ["search", query, type],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query, type })
      const response = await fetch(`/api/search?${params}`)
      if (!response.ok) {
        throw new Error("Search failed")
      }
      return response.json()
    },
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (prev) => prev,
  })
}
