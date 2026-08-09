"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { SyncHealthResponse } from "@/src/features/admin-analytics/types/admin-analytics-types"

export function useSyncHealth(limit = 10) {
    return useQuery({
        queryKey: ["admin-analytics", "sync-health", limit],
        queryFn: async () => {
            const res = await client["admin-analytics"]["sync-health"].$get({
                query: { limit: String(limit) },
            })
            const body = await parseRpcResponse<{ success: boolean; data: SyncHealthResponse }>(
                res,
                "Failed to load sync health"
            )
            return body.data
        },
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    })
}
