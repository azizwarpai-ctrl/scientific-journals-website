import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { type AboutContent } from "../schema"

export const useGetAboutContent = () => {
    return useQuery({
        queryKey: ["about-content"],
        queryFn: async () => {
            const response = await client.about.$get()
            if (!response.ok) {
                throw new Error("Failed to fetch about content")
            }
            const { data } = await response.json()
            return data as AboutContent
        },
        staleTime: 5 * 60 * 1000,
    })
}
