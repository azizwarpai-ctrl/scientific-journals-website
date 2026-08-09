"use client"

import { cn } from "@/src/lib/utils"
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react"

type AlertVariant = "error" | "success" | "info" | "warning"

interface AlertBannerProps {
    variant?: AlertVariant
    message: string
    className?: string
}

const variantStyles: Record<AlertVariant, { container: string; icon: string; IconComponent: typeof AlertCircle }> = {
    error: {
        container: "bg-destructive/10 border-destructive/20",
        icon: "text-destructive",
        IconComponent: XCircle,
    },
    success: {
        container: "bg-emerald-500/10 border-emerald-500/20",
        icon: "text-emerald-600 dark:text-emerald-400",
        IconComponent: CheckCircle2,
    },
    info: {
        container: "bg-sky-500/10 border-sky-500/20",
        icon: "text-sky-600 dark:text-sky-400",
        IconComponent: Info,
    },
    warning: {
        container: "bg-amber-500/10 border-amber-500/20",
        icon: "text-amber-600 dark:text-amber-400",
        IconComponent: AlertCircle,
    },
}

export function AlertBanner({ variant = "info", message, className }: AlertBannerProps) {
    const { container, icon, IconComponent } = variantStyles[variant]

    return (
        <div className={cn("flex items-center gap-2 rounded-lg border p-3", container, className)}>
            <IconComponent className={cn("h-4 w-4 shrink-0", icon)} />
            <p className={cn("text-sm", icon)}>{message}</p>
        </div>
    )
}
