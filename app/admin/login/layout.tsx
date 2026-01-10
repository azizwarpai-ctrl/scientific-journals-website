import type React from "react"

export default function AdminAuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Minimal layout for login/register pages
    // No sidebar or header, just render children
    return <>{children}</>
}
