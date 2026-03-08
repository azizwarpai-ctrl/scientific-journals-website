import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

export const useGetHealth = () => {
    return useQuery({
        queryKey: ["health"],
        queryFn: async () => {
            const response = await client.api.health.$get()

            if (!response.ok && response.status !== 503) {
                throw new Error("Failed to fetch system health")
            }

            const data = await response.json()
            return Object.assign(data, { httpStatus: response.status })
        },
        refetchInterval: 30000, // Poll every 30s
    })
}
