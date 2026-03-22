import { useQuery } from "@tanstack/react-query"
import type { Solution } from "../types/solution-type"

import { client } from "@/src/lib/rpc"

export const useGetFaqs = () => {
    const query = useQuery<Solution[], Error>({
        queryKey: ["faqs", "public"],
        queryFn: async () => {
            const response = await client.solutions.index.$get()

            if (!response.ok) {
                const error = await response.json() as { error?: string }
                throw new Error(error.error || "Failed to fetch FAQs")
            }

            const { data } = await response.json()

            return data as Solution[]
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
    })

    return query
}
