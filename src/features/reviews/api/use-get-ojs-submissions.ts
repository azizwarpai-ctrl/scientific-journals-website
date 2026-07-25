"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { SubmissionSummary } from "../types"

export interface OjsSubmissionFilters {
    page?: number
    limit?: number
    journalId?: number
    stageId?: number
    status?: number
    search?: string
}

export interface OjsSubmissionsResponse {
    success: boolean
    configured: boolean
    data: SubmissionSummary[]
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

export function useGetOjsSubmissions(filters: OjsSubmissionFilters = {}) {
    return useQuery({
        queryKey: ["reviews", "submissions", filters],
        queryFn: async () => {
            const query: Record<string, string> = {}
            if (filters.page !== undefined) query.page = String(filters.page)
            if (filters.limit !== undefined) query.limit = String(filters.limit)
            if (filters.journalId !== undefined) query.journalId = String(filters.journalId)
            if (filters.stageId !== undefined) query.stageId = String(filters.stageId)
            if (filters.status !== undefined) query.status = String(filters.status)
            if (filters.search) query.search = filters.search
            const res = await client.reviews.submissions.$get({ query })
            return parseRpcResponse<OjsSubmissionsResponse>(res, "Failed to load submissions")
        },
        staleTime: 60_000,
    })
}
