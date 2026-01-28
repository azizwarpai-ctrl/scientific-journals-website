"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { AdminHeader } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"
import { TestspriteWidget } from "@/components/testsprite/testsprite-widget"

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isLoginPage = pathname === "/admin/login" || pathname === "/admin/register"

    if (isLoginPage) {
        return (
            <main className="min-h-screen bg-background">
                {children}
                <TestspriteWidget />
            </main>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminSidebar />
            <div className="lg:pl-64">
                <AdminHeader />
                <main className="p-6">{children}</main>
            </div>
            <TestspriteWidget />
        </div>
    )
}
