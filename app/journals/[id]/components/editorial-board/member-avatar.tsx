"use client"

import { OjsImage } from "@/src/features/ojs/components/ojs-image"

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
 * Shows a photo fetched via the OJS image proxy when a URL is provided,
 * falling back silently to an initials tile on load failure or absent URL.
 */
export function MemberPhoto({ name, imageUrl, className = "" }: MemberPhotoProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-muted to-muted/60 ${className}`}
    >
      <OjsImage
        src={imageUrl}
        alt={name}
        fill
        className="object-cover"
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-sm font-semibold tracking-wide text-muted-foreground/70">
              {getInitials(name)}
            </span>
          </div>
        }
      />
    </div>
  )
}
