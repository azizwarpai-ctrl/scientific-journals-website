"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react"

type AlertVariant = "error" | "success" | "info" | "warning"

interface AlertBannerProps {
    variant?: AlertVariant
    message: string
    className?: string
}

const variantStyles: Record<AlertVariant, { container: string; icon: string; IconComponent: typeof AlertCircle }> = {
    error: {
        container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        icon: "text-red-600 dark:text-red-400",
        IconComponent: XCircle,
    },
    success: {
        container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
        icon: "text-green-600 dark:text-green-400",
        IconComponent: CheckCircle2,
    },
    info: {
        container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
        icon: "text-blue-600 dark:text-blue-400",
        IconComponent: Info,
    },
    warning: {
        container: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
        icon: "text-yellow-600 dark:text-yellow-400",
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
