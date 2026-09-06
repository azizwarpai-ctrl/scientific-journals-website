import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { client } from "@/src/lib/rpc"
import type { SerializedPricingPlan } from "./use-pricing-plans"
import type {
  PricingPlanCreateInput,
  PricingPlanUpdateInput,
} from "../types/billing"

export const useAdminPricingPlans = () => {
  return useQuery({
    queryKey: ["admin-pricing-plans"],
    queryFn: async (): Promise<SerializedPricingPlan[]> => {
      const response = await client.billing.plans.admin.all.$get()

      if (!response.ok) {
        throw new Error("Failed to fetch admin pricing plans")
      }

      const json = await response.json()
      return (json as { success: boolean; data: SerializedPricingPlan[] }).data
    },
  })
}

export const useCreatePricingPlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PricingPlanCreateInput) => {
      const response = await client.billing.plans.$post({
        json: data as any,
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error((json as any).error || "Failed to create pricing plan")
      }

      return (json as { success: boolean; data: SerializedPricingPlan }).data
    },
    onSuccess: () => {
      toast.success("Pricing plan created successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] })
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create pricing plan")
    },
  })
}

export const useUpdatePricingPlan = (id?: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id: planId, data }: { id?: string; data: PricingPlanUpdateInput }) => {
      const targetId = planId || id
      if (!targetId) throw new Error("Plan ID is required for update")

      const response = await client.billing.plans[":id"].$patch({
        param: { id: targetId },
        json: data as any,
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error((json as any).error || "Failed to update pricing plan")
      }

      return (json as { success: boolean; data: SerializedPricingPlan }).data
    },
    onSuccess: (_, variables) => {
      toast.success("Pricing plan updated successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] })
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] })
      const targetId = variables.id || id
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: ["pricing-plan", targetId] })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update pricing plan")
    },
  })
}

export const useTogglePricingPlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active?: boolean }) => {
      const response = await client.billing.plans[":id"].toggle.$patch({
        param: { id },
        json: is_active !== undefined ? { is_active } : {},
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error((json as any).error || "Failed to toggle pricing plan status")
      }

      return (json as { success: boolean; data: SerializedPricingPlan }).data
    },
    onSuccess: (data) => {
      toast.success(`Plan ${data.is_active ? "activated" : "deactivated"} successfully`)
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] })
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle pricing plan status")
    },
  })
}

export const useReorderPricingPlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const response = await client.billing.plans[":id"].reorder.$patch({
        param: { id },
        json: { sort_order },
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error((json as any).error || "Failed to reorder pricing plan")
      }

      return (json as { success: boolean; data: SerializedPricingPlan }).data
    },
    onSuccess: () => {
      toast.success("Plan order updated")
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] })
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reorder pricing plan")
    },
  })
}

export const useDeletePricingPlan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client.billing.plans[":id"].$delete({
        param: { id },
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error((json as any).error || "Failed to delete pricing plan")
      }

      return json
    },
    onSuccess: () => {
      toast.success("Pricing plan deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] })
      queryClient.invalidateQueries({ queryKey: ["pricing-plans"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete pricing plan")
    },
  })
}
