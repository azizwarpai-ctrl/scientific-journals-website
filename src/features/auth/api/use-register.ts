import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { RegisterInput } from "../schemas/auth-schema"
import type { AuthResponse } from "../types/auth-type"

export function useRegister() {
    return useMutation({
        mutationFn: async (input: RegisterInput): Promise<AuthResponse> => {
            const response = await client.auth.register.$post({
                json: input,
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error((data as any).error || "Registration failed")
            }
            return data as AuthResponse
        },
    })
}
