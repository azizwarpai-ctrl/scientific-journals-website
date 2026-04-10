import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { ReviewsResponse } from "../schemas/review-schema"

export function useGetReviews() {
    return useQuery<ReviewsResponse>({
        queryKey: ["admin-reviews"],
        queryFn: async () => {
            const response = await client.reviews.index.$get()
            const data = await response.json()
            if (!response.ok) {
                const err = data as { error?: string }
                throw new Error(err.error || "Failed to fetch reviews")
            }
            return data
        },
    })
}
