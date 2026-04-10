import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import type { ArticleDetail } from "../types/article-detail-types"

export interface ArticleDetailResponse {
    data: ArticleDetail | null;
    message?: string;
}

export const useGetArticleDetail = (journalId: string, publicationId: number | null) => {
    const query = useQuery<ArticleDetailResponse, Error>({
        queryKey: ["journal-article-detail", journalId, publicationId],
        queryFn: async () => {
            if (!publicationId) throw new Error("Publication ID is required")
            
            const response = await client.journals[":id"]["articles"][":publicationId"].$get({
                param: { id: journalId, publicationId: publicationId.toString() },
            })

            if (!response.ok) {
                let errorMsg = "Failed to fetch article detail"
                try {
                    const errorJson = await response.json() as { error?: string }
                    if (errorJson?.error) errorMsg = errorJson.error
                } catch {
                    // Ignore parsing error
                }
                throw new Error(errorMsg)
            }

            const payload = await response.json() as { success: boolean, data: ArticleDetail | null, message?: string }
            return {
                data: payload.data,
                message: payload.message,
            }
        },
        enabled: !!journalId && !!publicationId,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    })

    return query
}
