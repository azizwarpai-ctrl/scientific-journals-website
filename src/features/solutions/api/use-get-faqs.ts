import { useQuery } from "@tanstack/react-query"
import type { Solution } from "../types/solution-type"

import { client } from "@/src/lib/rpc"

export const useGetFaqs = () => {
    const query = useQuery<Solution[], Error>({
        queryKey: ["faqs", "public"],
        queryFn: async () => {
            const response = await client.solutions.$get()

            if (!response.ok) {
                const error = await response.json()
                throw new Error((error as any).error || "Failed to fetch FAQs")
            }

            const { data } = await response.json()

            return data as Solution[]
        },
        staleTime: 10 * 60 * 1000,
        retry: 2,
    })

    return query
}
