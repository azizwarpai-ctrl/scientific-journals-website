import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { ResendCodeInput } from "@/src/features/auth/schemas/auth-schema"

export const useResendCode = () => {
    return useMutation({
        mutationFn: async (payload: ResendCodeInput) => {
            const response = await client.auth["resend-code"].$post({ json: payload })
            const data = await response.json()
            if (!response.ok) {
                throw new Error((data as any).error || "Failed to resend code")
            }
            return data
        },
    })
}
