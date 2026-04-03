import { useQuery } from "@tanstack/react-query"
import type { SearchResponse } from "../schemas/search-schema"

export function useSearch(query: string, type: "all" | "journal" | "solution" | "faq" | "page" = "all") {
  return useQuery<SearchResponse>({
    queryKey: ["search", query, type],

    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q: query, type })
      // Pass AbortSignal so in-flight requests are cancelled when the
      // debounced query changes before the response arrives.
      const response = await fetch(`/api/search?${params}`, { signal })
      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`)
      }
      return response.json() as Promise<SearchResponse>
    },

    enabled: query.trim().length >= 2,

    // Keep previous results visible while new ones load (no flicker)
    placeholderData: (prev) => prev,

    // Cache for 30 s — fresh enough for a search UI
    staleTime: 30 * 1000,

    // Garbage-collect unused entries after 5 minutes
    gcTime: 5 * 60 * 1000,

    // Never auto-retry search — a failure should surface immediately
    retry: false,
  })
}
