"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { SubmissionReviewDetail } from "../types"

export interface OjsSubmissionResponse {
    success: boolean
    configured: boolean
    data: SubmissionReviewDetail | null
}

export function useGetOjsSubmission(submissionId: number) {
    return useQuery({
        queryKey: ["reviews", "submissions", submissionId],
        queryFn: async () => {
            const res = await client.reviews.submissions[":id"].$get({
                param: { id: String(submissionId) },
            })
            return parseRpcResponse<OjsSubmissionResponse>(res, "Failed to load submission")
        },
        enabled: submissionId > 0,
        staleTime: 300_000,
    })
}
