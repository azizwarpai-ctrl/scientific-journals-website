"use client"

import { useState } from "react"

interface MemberPhotoProps {
  name: string
  imageUrl?: string | null
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * MemberPhoto — rectangular portrait frame for editorial board members.
 *
 * Renders a real <img> when a valid URL is provided (http/https or
 * data:image/*) and silently falls back to an initials tile on load error
 * or when no URL is available. The container ships with no size/aspect
 * defaults — pass those via `className` (e.g. "aspect-[4/5] w-full").
 */
export function MemberPhoto({ name, imageUrl, className = "" }: MemberPhotoProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !failed

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-muted to-muted/60 ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl ?? ""}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-2xl font-semibold tracking-wide text-muted-foreground/70">
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  )
}
