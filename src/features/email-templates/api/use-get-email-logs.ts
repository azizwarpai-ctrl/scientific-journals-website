import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

export function useGetEmailLogs(page = 1, limit = 20, status?: string) {
  const query = useQuery({
    queryKey: ["email-logs", page, limit, status],
    queryFn: async () => {
      const qs: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      }
      if (status && status !== "all") {
        qs.status = status
      }

      const response = await client["email-templates"]["logs"].$get({
        query: qs,
      })

      if (!response.ok) {
        throw new Error("Failed to fetch email logs")
      }

      return await response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  return query
}
