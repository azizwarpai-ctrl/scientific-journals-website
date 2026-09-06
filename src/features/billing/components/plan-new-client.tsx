"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { PlanForm } from "./plan-form"
import { useCreatePricingPlan } from "../api/use-admin-pricing-plans"
import type { PricingPlanCreateInput } from "../types/billing"

export function PlanNewClient() {
  const router = useRouter()
  const { mutateAsync: createPlan, isPending } = useCreatePricingPlan()

  const handleSubmit = async (data: PricingPlanCreateInput) => {
    await createPlan(data)
    router.push("/admin/pricing")
  }

  return <PlanForm onSubmit={handleSubmit} isSubmitting={isPending} />
}
