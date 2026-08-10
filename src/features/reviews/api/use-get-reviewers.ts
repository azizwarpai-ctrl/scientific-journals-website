"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { ReviewerWorkload } from "../types"

export interface ReviewerFilters {
    page?: number
    limit?: number
    search?: string
}

export interface ReviewersResponse {
    success: boolean
    configured: boolean
    data: ReviewerWorkload[]
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

export function useGetReviewers(filters: ReviewerFilters = {}) {
    return useQuery({
        queryKey: ["reviews", "reviewers", filters],
        queryFn: async () => {
            const query: Record<string, string> = {}
            if (filters.page !== undefined) query.page = String(filters.page)
            if (filters.limit !== undefined) query.limit = String(filters.limit)
            if (filters.search) query.search = filters.search
            const res = await client.reviews.reviewers.$get({ query })
            return parseRpcResponse<ReviewersResponse>(res, "Failed to load reviewers")
        },
        staleTime: 60_000,
    })
}
