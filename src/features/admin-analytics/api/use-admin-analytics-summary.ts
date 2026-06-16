"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { AdminAnalyticsSummary } from "@/src/features/admin-analytics/types/admin-analytics-types"

export function useAdminAnalyticsSummary() {
  return useQuery({
    queryKey: ["admin-analytics", "summary"],
    queryFn: async () => {
      const res = await client["admin-analytics"].summary.$get()
      const body = await parseRpcResponse<{ success: boolean; data: AdminAnalyticsSummary }>(
        res,
        "Failed to load analytics summary"
      )
      return body.data
    },
    staleTime: 60 * 1000,
  })
}
