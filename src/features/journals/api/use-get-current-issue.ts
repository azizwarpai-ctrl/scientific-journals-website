import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { CurrentIssue } from "../types/current-issue-types"

export interface CurrentIssueResponse {
    data: CurrentIssue | null;
    message?: string;
}

export const useGetCurrentIssue = (id: string) => {
    const query = useQuery<CurrentIssueResponse, Error>({
        queryKey: ["journal-current-issue", id],
        queryFn: async () => {
            const response = await client.journals[":id"]["current-issue"].$get({
                param: { id },
            })

            if (!response.ok) {
                let errorMsg = "Failed to fetch current issue"
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
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        retry: 2,
    })

    return query
}
