import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

export interface JournalStats {
    articles: number;
    issues: number;
}

export const useGetJournalStats = (id: string) => {
    const query = useQuery<JournalStats, Error>({
        queryKey: ["journal-stats", id],
        queryFn: async () => {
            const response = await client.journals[":id"].stats.$get({
                param: { id },
            })

            if (!response.ok) {
                let errorMsg = "Failed to fetch journal stats"
                try {
                    const errorJson = await response.json() as { error?: string }
                    if (errorJson?.error) errorMsg = errorJson.error
                } catch {
                    // Ignore parsing error
                }
                throw new Error(errorMsg)
            }

            const payload = await response.json() as { success: boolean, data: JournalStats, message?: string }
            return payload.data
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        retry: 2,
    })

    return query
}
