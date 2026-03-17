import * as React from "react"
import { cn } from "@/src/lib/utils"
import Link from "next/link"

interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string
}

export function InteractiveCard({ className, href, children, ...props }: InteractiveCardProps) {
  const CardWrapper = (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-primary/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
        {CardWrapper}
      </Link>
    )
  }

  return CardWrapper
}
