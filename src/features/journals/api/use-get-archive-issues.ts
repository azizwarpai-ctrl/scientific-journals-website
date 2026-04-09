import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { ArchiveIssue } from "../types/archive-issue-types"

export interface ArchiveIssuesResponse {
    data: ArchiveIssue[];
    message?: string;
}

export const useGetArchiveIssues = (id: string) => {
    const query = useQuery<ArchiveIssuesResponse, Error>({
        queryKey: ["journal-archive-issues", id],
        queryFn: async () => {
            const response = await client.journals[":id"].archive.$get({
                param: { id },
            })

            if (!response.ok) {
                let errorMsg = "Failed to fetch archive issues"
                try {
                    const errorJson = await response.json() as any
                    if (errorJson?.error) errorMsg = errorJson.error
                } catch {
                    // Ignore parsing error
                }
                throw new Error(errorMsg)
            }

            const payload = await response.json() as { success: boolean, data: ArchiveIssue[], message?: string }
            return {
                data: payload.data || [],
                message: payload.message,
            }
        },
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10 min — archive data rarely changes
        retry: 2,
    })

    return query
}
