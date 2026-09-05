"use client"

import React from "react"
import { Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface OfferBadgeProps {
  type: "featured" | "limited-time" | "interval" | "status"
  value?: string | boolean
  className?: string
}

export function OfferBadge({ type, value, className }: OfferBadgeProps) {
  if (type === "featured") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide",
          "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20",
          "text-amber-600 dark:text-amber-400 border border-amber-500/30",
          "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
          className
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        Most Popular
      </span>
    )
  }

  if (type === "limited-time") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
          "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
          className
        )}
      >
        <Clock className="w-3 h-3 text-rose-500" />
        Limited Time
      </span>
    )
  }

  if (type === "interval") {
    const label =
      value === "year"
        ? "Billed Annually"
        : value === "one_time"
        ? "One-Time Payment"
        : "Billed Monthly"

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
          className
        )}
      >
        {label}
      </span>
    )
  }

  if (type === "status") {
    const isActive = Boolean(value)
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          isActive
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20",
          className
        )}
      >
        {isActive ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Active
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 text-slate-400" />
            Inactive
          </>
        )}
      </span>
    )
  }

  return null
}
