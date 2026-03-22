import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { AuthResponse } from "../types/auth-type"

export function useLogout() {
    return useMutation({
        mutationFn: async (): Promise<AuthResponse> => {
            const response = await client.auth.logout.$post()
            const data = await response.json()
            if (!response.ok) {
                throw new Error((data as any).error || "Logout failed")
            }
            return data as AuthResponse
        },
    })
}
