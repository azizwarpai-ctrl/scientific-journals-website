"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { TimeseriesMetric } from "@/src/features/admin-analytics/schemas/timeseries-schema"
import type { TimeseriesResponse } from "@/src/features/admin-analytics/types/admin-analytics-types"

export interface AdminTimeseriesParams {
    metrics: TimeseriesMetric[]
    interval: "day" | "month"
    from: string
    to: string
    journalId?: string
}

export function useAdminTimeseries(params: AdminTimeseriesParams) {
    return useQuery({
        queryKey: ["admin-analytics", "timeseries", params],
        queryFn: async () => {
            const res = await client["admin-analytics"].timeseries.$get({
                query: {
                    metrics: params.metrics.join(","),
                    interval: params.interval,
                    from: params.from,
                    to: params.to,
                    ...(params.journalId ? { journalId: params.journalId } : {}),
                },
            })
            const body = await parseRpcResponse<{ success: boolean; data: TimeseriesResponse }>(
                res,
                "Failed to load timeseries"
            )
            return body.data
        },
        staleTime: 60 * 1000,
    })
}

/**
 * Dashboard sparklines: views/downloads/submissions over the last 14 UTC
 * days. Window bounds are computed per render hour (stable within the
 * staleTime window, so the query key doesn't churn).
 */
export function useAdminSparklines() {
    const now = new Date()
    const to = now.toISOString().slice(0, 10)
    const from = new Date(now.getTime() - 13 * 86_400_000).toISOString().slice(0, 10)
    return useAdminTimeseries({
        metrics: ["views", "downloads", "submissions"],
        interval: "day",
        from,
        to,
    })
}
