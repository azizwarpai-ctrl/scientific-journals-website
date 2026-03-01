"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"

// Pages that should NOT show the sidebar/header (auth-related pages)
const AUTH_PAGES = [
  "/admin/login",
  "/admin/register",
  "/admin/registration-success",
  "/admin/verify-code",
]

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))

  // Auth pages render without the dashboard shell
  if (isAuthPage) {
    return <>{children}</>
  }

  // Dashboard pages render with sidebar + header
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col lg:ml-64">
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
