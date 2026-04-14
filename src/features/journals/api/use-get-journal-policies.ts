import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { JournalPolicies } from "@/src/features/journals/server/journal-policies-service"

export function useGetJournalPolicies(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["journal-policies", journalId],
    queryFn: async (): Promise<JournalPolicies | null> => {
      if (!journalId) return null
      const res = await client.journals[":id"]["policies"].$get({
        param: { id: journalId },
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch journal policies: ${res.status}`)
      }
      const payload = await res.json()
      if (!payload.success) {
        throw new Error((payload as { error?: string }).error ?? "Unknown error")
      }
      return (payload as { success: true; data: JournalPolicies | null }).data ?? null
    },
    enabled: !!journalId,
    staleTime: 10 * 60 * 1000, // 10 min — policies change rarely
    retry: 1,
  })
}
