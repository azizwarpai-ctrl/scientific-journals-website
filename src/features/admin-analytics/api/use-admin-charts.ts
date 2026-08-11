"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { AnalyticsCharts } from "@/src/features/admin-analytics/types/charts-types"

/** Charts for the analytics deep-dive; `journalId` omitted = all journals. */
export function useAdminCharts(journalId?: string) {
  return useQuery({
    queryKey: ["admin-analytics", "charts", journalId ?? "all"],
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsCharts> => {
      const query = journalId ? { journalId } : {}
      const res = await client["admin-analytics"].charts.$get({ query })
      const body = await parseRpcResponse<{ success: boolean; data: AnalyticsCharts }>(
        res,
        "Failed to load analytics charts"
      )
      return body.data
    },
  })
}
