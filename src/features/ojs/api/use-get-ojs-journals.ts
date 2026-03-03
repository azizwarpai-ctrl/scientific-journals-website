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
                throw new Error((data as any).error || "Failed to fetch OJS journals")
            }
            return data
        },
        staleTime: 5 * 60 * 1000, // 5 minutes — OJS data changes infrequently
    })
}
