import { useQuery } from "@tanstack/react-query"
import type { CustomBlocksResponse } from "@/src/features/journals/types/custom-block-types"

interface ApiResponse {
  success: boolean
  data?: CustomBlocksResponse
  message?: string
  error?: string
}

export function useGetCustomBlocks(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["custom-blocks", journalId],
    queryFn: async (): Promise<CustomBlocksResponse> => {
      if (!journalId) return { blocks: [] }
      const res = await fetch(`/api/journals/${encodeURIComponent(journalId)}/custom-blocks`)
      if (!res.ok) {
        throw new Error(`Failed to fetch custom blocks: ${res.status}`)
      }
      const payload: ApiResponse = await res.json()
      if (!payload.success) {
        throw new Error(payload.error ?? "Unknown error")
      }
      return payload.data ?? { blocks: [] }
    },
    enabled: !!journalId,
    staleTime: 1000 * 60 * 10, // 10 min
    retry: 1,
  })
}
