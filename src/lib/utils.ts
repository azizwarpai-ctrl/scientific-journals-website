import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Stable date string pinned to en-US + UTC. Admin tables are client components
 * server-rendered with the same row props, so an unpinned locale/timezone would
 * differ between SSR and hydration → React #418. Falls back to "—" for empty or
 * invalid input.
 */
export function formatDate(iso: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { ...options, timeZone: "UTC" })
}

export const STATUS_STYLES: Record<string, string> = {
  // Submission lifecycle
  submitted: "bg-primary/10 text-primary",
  under_review: "bg-secondary/10 text-secondary",
  revision_required: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  published: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  rejected: "bg-destructive/10 text-destructive",
  // Reviews
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  in_progress: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  declined: "bg-destructive/10 text-destructive",
  // Email delivery
  sent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
  queued: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  // Messages
  unread: "bg-primary/10 text-primary",
  read: "bg-muted text-muted-foreground",
  replied: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  archived: "bg-muted text-muted-foreground",
  // Generic
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  running: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
}

/**
 * Badge classes for an arbitrary status string, with a neutral fallback so
 * unknown statuses never fall back to hardcoded literal colors.
 */
export function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return "bg-muted text-muted-foreground"
  return STATUS_STYLES[status.toLowerCase().replace(/[\s-]+/g, "_")] ?? "bg-muted text-muted-foreground"
}

/**
 * Localized count formatting pinned to en-US. Returns "—" when null or undefined.
 */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString("en-US")
}

