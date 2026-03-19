import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { RegistrationPayload } from "@/src/features/auth/schemas/registration-schemas"

export interface OjsRegisterResponse {
  success: boolean;
  status: "sso_redirect" | "success";
  ssoUrl?: string;
  email: string;
  message: string;
}

interface UseOjsRegisterProps {
  onMutate?: () => void
  onError?: (error: Error) => void
  onSuccess?: (data: OjsRegisterResponse) => void
}

export const useOjsRegister = (props?: UseOjsRegisterProps) => {
  return useMutation({
    mutationFn: async ({ 
      payload, 
      journalPath 
    }: { 
      payload: RegistrationPayload; 
      journalPath?: string 
    }): Promise<OjsRegisterResponse> => {
      const response = await client.ojs.register.$post({
        json: payload,
        query: { journalPath: journalPath || "" },
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error((data as any).error || "Registration failed")
      }
      
      return data as OjsRegisterResponse
    },
    onMutate: props?.onMutate,
    onError: props?.onError,
    onSuccess: props?.onSuccess,
  })
}
