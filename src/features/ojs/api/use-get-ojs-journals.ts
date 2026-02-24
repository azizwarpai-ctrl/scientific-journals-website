import { useQuery } from "@tanstack/react-query"
import type { OjsJournalsResponse } from "../types/ojs-type"

export function useGetOjsJournals() {
    return useQuery<OjsJournalsResponse>({
        queryKey: ["ojs-journals"],
        queryFn: async () => {
            const response = await fetch("/api/ojs/journals")
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch OJS journals")
            }
            return data
        },
        staleTime: 5 * 60 * 1000, // 5 minutes — OJS data changes infrequently
    })
}
