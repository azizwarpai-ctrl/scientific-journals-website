import React from "react"

export function SectionEyebrow({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </div>
  )
}
