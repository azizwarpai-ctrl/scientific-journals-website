import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { VerifyCodeInput } from "@/src/features/auth/schemas/auth-schema"

export const useVerifyCode = () => {
    return useMutation({
        mutationFn: async (payload: VerifyCodeInput) => {
            const response = await client.auth["verify-code"].$post({ json: payload })
            const data = await response.json()
            if (!response.ok) {
                throw new Error((data as any).error || "Verification failed")
            }
            return data
        },
    })
}
