import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { OjsJournalsResponse } from "../schemas/ojs-schema"

export function useGetOjsJournals() {
    return useQuery<OjsJournalsResponse>({
        queryKey: ["ojs-journals"],
        queryFn: async () => {
            const response = await client.ojs.journals.$get()
            const data = await response.json()
            if (!response.ok) {
                const err = data as { error?: string }
                throw new Error(err.error || "Failed to fetch OJS journals")
            }
            return data
        },
        staleTime: 5 * 60 * 1000, // 5 minutes — OJS data changes infrequently
    })
}
