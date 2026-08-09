"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, RefreshCw, Mail } from "lucide-react"
import { useGetAuthMe } from "@/src/features/auth"
import { useAdminAlerts } from "@/src/features/admin-analytics/api/use-admin-alerts"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs"

export function AdminHeader() {
  const router = useRouter()
  const { data: adminUser, isLoading, isError } = useGetAuthMe()
  const alerts = useAdminAlerts()

  useEffect(() => {
    if (isError) {
      router.push("/admin/login")
    }
  }, [isError, router])

  if (isError) return null

  const getInitials = (name: string | null) => {
    if (!name) return "A"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="flex h-16 items-center gap-2 border-b bg-card px-4 sm:px-6">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <AdminBreadcrumbs />
      <div className="flex-1" />

      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative bg-transparent"
              aria-label={
                alerts.total > 0 ? `Notifications: ${alerts.total} alerts` : "Notifications"
              }
            >
              <Bell className="h-5 w-5" />
              {alerts.total > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {alerts.total > 99 ? "99+" : alerts.total}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.total === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                All clear — no alerts.
              </div>
            ) : (
              <>
                {alerts.syncFailureStreak > 0 && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/analytics" className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-destructive" />
                      <span>
                        {alerts.syncFailureStreak} failed sync{" "}
                        {alerts.syncFailureStreak === 1 ? "run" : "runs"} — view sync health
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {alerts.unreadMessages > 0 && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/messages" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>
                        {alerts.unreadMessages} unread{" "}
                        {alerts.unreadMessages === 1 ? "message" : "messages"}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2" disabled={isLoading}>
              {isLoading ? (
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              ) : (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(adminUser?.full_name || null)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {adminUser?.full_name || adminUser?.email || "Admin"}
                  </span>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{adminUser?.email}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
