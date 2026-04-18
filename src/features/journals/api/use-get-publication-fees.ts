import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { PublicationFeesPage } from "@/src/features/journals/server/publication-fees-service"

export function useGetPublicationFees(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["journal-publication-fees", journalId],
    queryFn: async (): Promise<PublicationFeesPage | null> => {
      if (!journalId) return null
      const res = await client.journals[":id"]["publication-fees"].$get({
        param: { id: journalId },
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch publication fees: ${res.status}`)
      }
      const payload = await res.json()
      if (!payload.success) {
        throw new Error((payload as { error?: string }).error ?? "Unknown error")
      }
      return (payload as { success: true; data: PublicationFeesPage | null }).data ?? null
    },
    enabled: !!journalId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
