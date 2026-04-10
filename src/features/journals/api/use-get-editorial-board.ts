import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { EditorialBoardResponse } from "@/src/features/journals/types/editorial-board-types"

export function useGetEditorialBoard(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["editorial-board", journalId],
    queryFn: async (): Promise<EditorialBoardResponse> => {
      if (!journalId) return { members: [] }
      const res = await client.journals[":id"]["editorial-board"].$get({
        param: { id: journalId },
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch editorial board: ${res.status}`)
      }
      const payload = await res.json()
      if (!payload.success) {
        throw new Error(payload.error ?? "Unknown error")
      }
      return payload.data ?? { members: [] }
    },
    enabled: !!journalId,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
  })
}
