import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { PricingAdminClient } from "@/src/features/billing/components/pricing-admin-client"

export const metadata = {
  title: "Pricing & Packages | Admin Dashboard",
  description: "Manage publication packages, tiers, pricing, and features.",
}

export default async function PricingPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Double check admin privileges
  if (session.role !== "admin" && session.role !== "superadmin") {
    redirect("/admin/dashboard")
  }

  return <PricingAdminClient />
}
