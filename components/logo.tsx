"use client"

import Link from "next/link"
import { cn } from "@/src/lib/utils"

interface LogoProps {
  className?: string
  /** Show only the icon mark (no wordmark) */
  iconOnly?: boolean
  /** Wrap in a Link to "/" — set to false when used inside an existing Link */
  asLink?: boolean
}

const ACCENT = "#F97316" // tailwind orange-500

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {/* Back layer */}
      <rect
        x="10"
        y="16"
        width="24"
        height="20"
        rx="4"
        fill="currentColor"
        fillOpacity="0.25"
      />
      {/* Middle layer */}
      <rect
        x="7"
        y="12"
        width="24"
        height="20"
        rx="4"
        fill="currentColor"
        fillOpacity="0.5"
      />
      {/* Front layer */}
      <rect
        x="4"
        y="8"
        width="24"
        height="20"
        rx="4"
        fill="currentColor"
      />
      {/* Spine accent line on front layer */}
      <line
        x1="10"
        y1="13"
        x2="10"
        y2="23"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Digital pulse dot */}
      <circle cx="34" cy="10" r="4" fill={ACCENT} />
      {/* Subtle ring around dot */}
      <circle
        cx="34"
        cy="10"
        r="6.5"
        stroke={ACCENT}
        strokeOpacity="0.25"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  )
}

function LogoContent({ iconOnly }: { iconOnly?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="h-9 w-9 sm:h-10 sm:w-10 text-foreground" />
      {!iconOnly && (
        <span
          className={cn(
            "font-extrabold tracking-tight leading-none",
            "text-xl sm:text-[1.55rem]",
            "text-foreground"
          )}
        >
          Digito<span style={{ color: ACCENT }}>Pub</span>
        </span>
      )}
    </span>
  )
}

export function Logo({ className, iconOnly, asLink = false }: LogoProps) {
  if (asLink) {
    return (
      <Link
        href="/"
        aria-label="DigitoPub — go to homepage"
        className={cn(
          "inline-flex items-center outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md",
          className
        )}
      >
        <LogoContent iconOnly={iconOnly} />
      </Link>
    )
  }

  return (
    <span
      aria-label="DigitoPub"
      className={cn("inline-flex items-center", className)}
    >
      <LogoContent iconOnly={iconOnly} />
    </span>
  )
}
