import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { PlanNewClient } from "@/src/features/billing/components/plan-new-client"

export const metadata = {
  title: "New Pricing Plan | Admin Dashboard",
  description: "Create a new pricing tier or publication package.",
}

export default async function NewPricingPlanPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    redirect("/admin/dashboard")
  }

  return <PlanNewClient />
}
