import type React from "react"
import { AdminLayoutWrapper } from "@/components/admin-layout-wrapper"

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
}
