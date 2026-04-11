import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { type AboutSection } from "../schema"

export const useGetAboutSections = (isAdmin = false) => {
    return useQuery({
        queryKey: ["about-sections", isAdmin],
        queryFn: async () => {
            const endpoint = isAdmin ? client.about.admin.$get : client.about.$get;
            const response = await endpoint()
            if (!response.ok) {
                throw new Error("Failed to fetch about sections")
            }
            const { data } = await response.json()
            return data as AboutSection[]
        },
        staleTime: isAdmin ? 0 : 5 * 60 * 1000,
    })
}
