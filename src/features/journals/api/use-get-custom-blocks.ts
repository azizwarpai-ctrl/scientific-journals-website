import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { CustomBlocksResponse } from "@/src/features/journals/types/custom-block-types"

export function useGetCustomBlocks(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["custom-blocks", journalId],
    queryFn: async (): Promise<CustomBlocksResponse> => {
      if (!journalId) return { blocks: [] }
      const res = await client.journals[":id"]["custom-blocks"].$get({
        param: { id: journalId },
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch custom blocks: ${res.status}`)
      }
      const payload = await res.json()
      if (!payload.success) {
        throw new Error(payload.error ?? "Unknown error")
      }
      return payload.data ?? { blocks: [] }
    },
    enabled: !!journalId,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
  })
}
