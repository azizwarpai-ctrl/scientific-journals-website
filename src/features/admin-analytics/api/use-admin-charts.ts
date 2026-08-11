import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { AnalyticsCharts } from "@/src/features/admin-analytics/types/charts-types"

/** Charts for the analytics deep-dive; `journalId` omitted = all journals. */
export function useAdminCharts(journalId?: string) {
  return useQuery({
    queryKey: ["admin-analytics", "charts", journalId ?? "all"],
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsCharts> => {
      const query = journalId ? { journalId } : {}
      const res = await client["admin-analytics"].charts.$get({ query })
      if (!res.ok) throw new Error("Failed to load analytics charts")
      const json = (await res.json()) as { success: boolean; data: AnalyticsCharts }
      return json.data
    },
  })
}
