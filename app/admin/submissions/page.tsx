import { redirect } from "next/navigation"
import { Suspense } from "react"
import { SubmissionsPageClient } from "@/components/admin/submissions-page-client"

export default async function SubmissionsPage() {
  // Mock authentication check - always authorized for build
  const user = { id: "mock-admin" }

  if (!user) {
    redirect("/admin/login")
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubmissionsPageClient />
    </Suspense>
  )
}
