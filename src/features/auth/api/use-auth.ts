import { useMutation } from "@tanstack/react-query"
import type { LoginInput, RegisterInput } from "../schemas/auth-schema"
import type { AuthResponse } from "../types/auth-type"

import { client } from "@/src/lib/rpc"

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
