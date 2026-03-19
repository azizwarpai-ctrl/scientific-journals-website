import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { RegistrationPayload } from "../schemas/registration-schemas"

interface UseOjsRegisterProps {
  onMutate?: () => void
  onError?: (error: Error) => void
  onSuccess?: (data: any) => void
}

export const useOjsRegister = (props?: UseOjsRegisterProps) => {
  return useMutation({
    mutationFn: async ({ 
      payload, 
      journalPath 
    }: { 
      payload: RegistrationPayload; 
      journalPath?: string 
    }) => {
      const response = await client.ojs.register.$post({
        json: payload,
        query: { journalPath: journalPath || "" },
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error((data as any).error || "Registration failed")
      }
      
      return data
    },
    onMutate: props?.onMutate,
    onError: props?.onError,
    onSuccess: props?.onSuccess,
  })
}
