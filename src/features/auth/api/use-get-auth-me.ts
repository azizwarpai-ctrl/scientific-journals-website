import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { AuthUser } from "../types/auth-type"

export function useGetAuthMe() {
    return useQuery({
        queryKey: ["admin-me"],
        queryFn: async (): Promise<AuthUser> => {
            const response = await client.auth.me.$get()
            const data = await response.json()
            if (!response.ok || !data.success || !data.user) {
                throw new Error((data as any).error || "Failed to fetch user session")
            }
            return data.user as AuthUser
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
    })
}
