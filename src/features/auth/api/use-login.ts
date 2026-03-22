import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { LoginInput } from "../schemas/auth-schema"
import type { AuthResponse } from "../types/auth-type"

export function useLogin() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: LoginInput): Promise<AuthResponse> => {
            const response = await client.auth.login.$post({
                json: input,
            })
            const data = await response.json() as AuthResponse
            if (!response.ok) {
                throw new Error(data.error || "Login failed")
            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-me"] })
        },
    })
}
