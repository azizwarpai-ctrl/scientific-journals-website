import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

export function useGetEmailStatus() {
  const query = useQuery({
    queryKey: ["email-status"],
    queryFn: async () => {
      const response = await client["email-templates"].status.$get()

      if (!response.ok) {
        throw new Error("Failed to fetch email status")
      }

      const { data } = await response.json()
      return data as { smtpConfigured: boolean; provider: string }
    },
    // Prevent frequent polling for status since it rarely changes
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry if it fails (e.g. offline)
  })

  return query
}
