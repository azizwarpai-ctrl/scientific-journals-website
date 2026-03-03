import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { homeStatsSchema } from "../schemas/home-stats-schema"
import type { HomeStatsResponse } from "../types/home-stats-type"

export function useGetHomeStats() {
    return useQuery<HomeStatsResponse["data"]>({
        queryKey: ["home-stats"],
        queryFn: async () => {
            const response = await client["home-stats"].$get()

            if (!response.ok) {
                throw new Error("Failed to fetch home stats")
            }

            const json = await response.json()
            const { data } = homeStatsSchema.parse(json)
            return data
        },
        staleTime: 60 * 60 * 1000, // 1 hour — stats don't change that fast
    })
}
