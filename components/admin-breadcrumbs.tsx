"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { findAdminNavItem } from "@/src/config/admin-nav"

/** Humanizes a path segment ("email-templates" → "Email Templates"). */
function humanize(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function AdminBreadcrumbs() {
  const pathname = usePathname()
  const navItem = findAdminNavItem(pathname)

  // /admin/journals/new → [Admin, Journals, New]; detail ids render as-is.
  const trailing = navItem
    ? pathname
        .slice(navItem.href.length)
        .split("/")
        .filter(Boolean)
    : []

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:block">
          <BreadcrumbLink asChild>
            <Link href="/admin/dashboard">Admin</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {navItem && (
          <>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              {trailing.length === 0 ? (
                <BreadcrumbPage>{navItem.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={navItem.href}>{navItem.title}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
        {trailing.map((segment, i) => (
          <BreadcrumbItem key={`${segment}-${i}`}>
            <BreadcrumbSeparator />
            {i === trailing.length - 1 ? (
              <BreadcrumbPage>{humanize(segment)}</BreadcrumbPage>
            ) : (
              <span className="text-muted-foreground">{humanize(segment)}</span>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
