"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AdminHeader } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"
import { TestspriteWidget } from "@/components/testsprite/testsprite-widget"
import { useCurrentUser } from "@/lib/client/hooks/useAuth"

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const isLoginPage = pathname === "/admin/login" || pathname === "/admin/register"

    // Check authentication status
    const { data: user, isLoading, isError } = useCurrentUser()

    // Redirect to login if not authenticated (except on login/register pages)
    useEffect(() => {
        if (!isLoginPage && !isLoading && (!user || isError)) {
            router.push("/admin/login")
        }
    }, [user, isLoading, isError, isLoginPage, router])

    // Render login/register pages without auth check
    if (isLoginPage) {
        return (
            <main className="min-h-screen bg-background">
                {children}
                <TestspriteWidget />
            </main>
        )
    }

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                            Loading...
                        </span>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">Verifying authentication...</p>
                </div>
            </div>
        )
    }

    // Don't render protected content if not authenticated
    if (!user) {
        return null
    }

    // Render admin layout for authenticated users
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
