import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

export const useGetMetrics = () => {
    return useQuery({
        queryKey: ["metrics"],
        queryFn: async () => {
            const response = await client.metrics.$get()

            if (!response.ok) {
                throw new Error("Failed to fetch metrics")
            }

            const data = await response.json()
            return data
        },
    })
}
