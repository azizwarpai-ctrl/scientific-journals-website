import { useQuery } from "@tanstack/react-query"
import type { Journal } from "../types/journal-type"

import { client } from "@/src/lib/rpc"

export const useGetJournal = (id: string) => {
    const query = useQuery<Journal, Error>({
        queryKey: ["journals", id],
        queryFn: async () => {
            const response = await client.api.journals[":id"].$get({
                param: { id },
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error((error as any).error || "Failed to fetch journal")
            }

            const { data } = await response.json()

            return data as Journal
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        retry: 2,
    })

    return query
}
