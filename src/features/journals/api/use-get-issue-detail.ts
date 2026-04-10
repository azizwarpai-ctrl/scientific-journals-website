import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { CurrentIssue } from "../types/current-issue-types"

export interface IssueDetailResponse {
    data: CurrentIssue | null;
    message?: string;
}

export const useGetIssueDetail = (journalId: string, issueId: number | null) => {
    const query = useQuery<IssueDetailResponse, Error>({
        queryKey: ["journal-issue-detail", journalId, issueId],
        queryFn: async () => {
            if (!issueId) throw new Error("Issue ID is required")

            const response = await client.journals[":id"].issues[":issueId"].$get({
                param: { id: journalId, issueId: String(issueId) },
            })

            if (!response.ok) {
                let errorMsg = "Failed to fetch issue detail"
                try {
                    const errorJson = await response.json() as { error?: string }
                    if (errorJson?.error) errorMsg = errorJson.error
                } catch {
                    // Ignore parsing error
                }
                throw new Error(errorMsg)
            }

            const payload = await response.json() as { success: boolean, data: CurrentIssue | null, message?: string }
            return {
                data: payload.data,
                message: payload.message,
            }
        },
        enabled: !!journalId && !!issueId,
        staleTime: 10 * 60 * 1000,
        retry: 2,
    })

    return query
}
