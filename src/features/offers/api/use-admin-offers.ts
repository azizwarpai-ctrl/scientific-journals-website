import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Offer, OfferCreateInput, OfferUpdateInput } from "../types/offer"

interface AdminOffersQueryParams {
  page?: number
  limit?: number
  journal_id?: string
  is_active?: boolean
  is_featured?: boolean
}

interface AdminOffersResponse {
  data: Offer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const useAdminOffers = (params?: AdminOffersQueryParams) => {
  return useQuery({
    queryKey: ["admin-offers", params],
    queryFn: async (): Promise<AdminOffersResponse> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set("page", String(params.page))
      if (params?.limit) searchParams.set("limit", String(params.limit))
      if (params?.journal_id) searchParams.set("journal_id", params.journal_id)
      if (params?.is_active !== undefined) searchParams.set("is_active", String(params.is_active))
      if (params?.is_featured !== undefined) searchParams.set("is_featured", String(params.is_featured))

      const url = `/api/offers/admin/all${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch admin offers")
      }

      return await response.json()
    },
  })
}

export const useCreateOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OfferCreateInput) => {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Failed to create offer")
      }

      return json.data as Offer
    },
    onSuccess: () => {
      toast.success("Offer created successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] })
      queryClient.invalidateQueries({ queryKey: ["offers"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create offer")
    },
  })
}

export const useUpdateOffer = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OfferUpdateInput) => {
      const response = await fetch(`/api/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Failed to update offer")
      }

      return json.data as Offer
    },
    onSuccess: () => {
      toast.success("Offer updated successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] })
      queryClient.invalidateQueries({ queryKey: ["offers"] })
      queryClient.invalidateQueries({ queryKey: ["offer", id] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update offer")
    },
  })
}

export const useToggleOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active?: boolean }) => {
      const response = await fetch(`/api/offers/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(is_active !== undefined ? { is_active } : {}),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Failed to toggle offer status")
      }

      return json.data as Offer
    },
    onSuccess: (data) => {
      toast.success(`Offer ${data.is_active ? "activated" : "deactivated"} successfully`)
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] })
      queryClient.invalidateQueries({ queryKey: ["offers"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle offer status")
    },
  })
}

export const useReorderOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const response = await fetch(`/api/offers/${id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Failed to reorder offer")
      }

      return json.data as Offer
    },
    onSuccess: () => {
      toast.success("Offer order updated")
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] })
      queryClient.invalidateQueries({ queryKey: ["offers"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reorder offer")
    },
  })
}

export const useDeleteOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/offers/${id}`, {
        method: "DELETE",
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || "Failed to delete offer")
      }

      return json
    },
    onSuccess: () => {
      toast.success("Offer deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] })
      queryClient.invalidateQueries({ queryKey: ["offers"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete offer")
    },
  })
}
