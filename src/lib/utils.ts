import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-primary/10 text-primary",
  under_review: "bg-secondary/10 text-secondary",
  revision_required: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  published: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  rejected: "bg-destructive/10 text-destructive",
}
