import { useQuery } from "@tanstack/react-query"
import type { EditorialBoardResponse } from "@/src/features/journals/types/editorial-board-types"

interface ApiResponse {
  success: boolean
  data?: EditorialBoardResponse
  message?: string
  error?: string
}

export function useGetEditorialBoard(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["editorial-board", journalId],
    queryFn: async (): Promise<EditorialBoardResponse> => {
      if (!journalId) return { members: [] }
      const res = await fetch(`/api/journals/${encodeURIComponent(journalId)}/editorial-board`)
      if (!res.ok) {
        throw new Error(`Failed to fetch editorial board: ${res.status}`)
      }
      const payload: ApiResponse = await res.json()
      if (!payload.success) {
        throw new Error(payload.error ?? "Unknown error")
      }
      return payload.data ?? { members: [] }
    },
    enabled: !!journalId,
    staleTime: 1000 * 60 * 10, // 10 min — board rarely changes
    retry: 1,
  })
}
