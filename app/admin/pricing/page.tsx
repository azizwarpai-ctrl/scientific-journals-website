import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { PricingClient } from "@/src/features/billing/components/pricing-client"

export default async function PricingPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Double check admin privileges
  if (session.role !== "admin" && session.role !== "superadmin") {
    redirect("/admin/dashboard")
  }

  return <PricingClient />
}
