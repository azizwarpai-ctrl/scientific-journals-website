import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { PlanEditClient } from "@/src/features/billing/components/plan-edit-client"

export const metadata = {
  title: "Edit Pricing Plan | Admin Dashboard",
  description: "Edit pricing package, features, and settings.",
}

interface EditPricingPlanPageProps {
  params: Promise<{ id: string }>
}

export default async function EditPricingPlanPage({ params }: EditPricingPlanPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    redirect("/admin/dashboard")
  }

  const { id } = await params

  return <PlanEditClient id={id} />
}
