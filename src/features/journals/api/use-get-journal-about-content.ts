import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { JournalAboutContent } from "@/src/features/journals/server/about-content-service"

export function useGetJournalAboutContent(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["journal-about-content", journalId],
    queryFn: async (): Promise<JournalAboutContent | null> => {
      if (!journalId) return null
      const res = await client.journals[":id"]["about-content"].$get({
        param: { id: journalId },
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch journal about content: ${res.status}`)
      }
      const payload = await res.json()
      if (!payload.success) {
        throw new Error((payload as { error?: string }).error ?? "Unknown error")
      }
      return (payload as { success: true; data: JournalAboutContent | null }).data ?? null
    },
    enabled: !!journalId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
