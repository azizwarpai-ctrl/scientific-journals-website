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
                const error = await response.json()
                throw new Error((error as any).error || "Failed to fetch journal stats")
            }

            return await response.json() as JournalStats
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        retry: 2,
    })

    return query
}
