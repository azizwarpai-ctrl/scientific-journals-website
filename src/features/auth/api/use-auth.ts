import { useMutation } from "@tanstack/react-query"
import type { LoginInput, RegisterInput } from "../schemas/auth-schema"
import type { AuthResponse } from "../types/auth-type"

async function postAuth(endpoint: string, body: LoginInput | RegisterInput): Promise<AuthResponse> {
    const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) {
        throw new Error(data.error || `${endpoint} failed`)
    }
    return data
}

export function useLogin() {
    return useMutation({
        mutationFn: (input: LoginInput) => postAuth("login", input),
    })
}

export function useRegister() {
    return useMutation({
        mutationFn: (input: RegisterInput) => postAuth("register", input),
    })
}

export function useLogout() {
    return useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/auth/logout", { method: "POST" })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Logout failed")
            return data
        },
    })
}
