"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { ReviewOverview } from "../types"

export interface ReviewOverviewResponse {
    success: boolean
    configured: boolean
    data: ReviewOverview | null
}

export function useGetReviewOverview() {
    return useQuery({
        queryKey: ["reviews", "overview"],
        queryFn: async () => {
            const res = await client.reviews.overview.$get()
            return parseRpcResponse<ReviewOverviewResponse>(res, "Failed to load review overview")
        },
        staleTime: 60_000,
    })
}
