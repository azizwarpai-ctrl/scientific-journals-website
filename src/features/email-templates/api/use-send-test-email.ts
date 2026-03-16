"use client"

import { useMutation } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async ({ param, json }: { param: { id: string }, json: any }) => {
      const res = await client["email-templates"][":id"]["send-test"].$post({ param, json })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error((data as any).error || "Failed to send test email")
      }
      
      return data
    },
    onSuccess: () => {
      toast.success("Test email sent successfully!")
    },
    onError: (error: Error) => {
      console.error("Error sending test email:", error)
      toast.error(error.message || "Failed to send test email")
    },
  })
}
