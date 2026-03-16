import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { type PlatformStatistics } from "../schema"

export const useGetPlatformStatistics = () => {
    return useQuery({
        queryKey: ["platform-statistics"],
        queryFn: async () => {
            const response = await client.statistics.$get()
            if (!response.ok) {
                throw new Error("Failed to fetch platform statistics")
            }
            const { data } = await response.json()
            return data as PlatformStatistics
        },
        staleTime: 5 * 60 * 1000, // 5 minutes fresh on the client side
    })
}
