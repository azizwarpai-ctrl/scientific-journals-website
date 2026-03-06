import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { ReviewsResponse } from "../schemas/review-schema"

export function useGetReviews() {
    return useQuery<ReviewsResponse>({
        queryKey: ["admin-reviews"],
        queryFn: async () => {
            const response = await client.api.reviews.$get()
            const data = await response.json()
            if (!response.ok) {
                throw new Error((data as any).error || "Failed to fetch reviews")
            }
            return data
        },
    })
}
