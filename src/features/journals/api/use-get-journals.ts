import { useQuery } from "@tanstack/react-query"
import type { Journal } from "../types/journal-type"

import { client } from "@/src/lib/rpc"

export const useGetJournals = () => {
    const query = useQuery<Journal[], Error>({
        queryKey: ["journals"],
        queryFn: async () => {
            const response = await client.api.journals.$get()

            if (!response.ok) {
                const error = await response.json()
                throw new Error((error as any).error || "Failed to fetch journals")
            }

            const { data } = await response.json()

            return data as Journal[]
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
    })

    return query
}
