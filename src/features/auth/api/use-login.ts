import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { LoginInput } from "../schemas/auth-schema"
import type { AuthResponse } from "../types/auth-type"

export function useLogin() {
    return useMutation({
        mutationFn: async (input: LoginInput): Promise<AuthResponse> => {
            const response = await client.auth.login.$post({
                json: input,
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error((data as any).error || "Login failed")
            }
            return data as AuthResponse
        },
    })
}
