"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/src/lib/utils"

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export function Logo({ className, width = 180, height = 60 }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to use based on the theme
  const currentTheme = mounted ? resolvedTheme : "light"
  const logoSrc = currentTheme === "dark" 
    ? "/images/logodigitopub-white.png" 
    : "/images/logodigitopub.png"

  return (
    <Image 
      src={logoSrc} 
      alt="DigitoPub Logo" 
      width={width} 
      height={height} 
      className={cn(
        "transition-opacity duration-300", 
        !mounted ? "opacity-0" : "opacity-100",
        className
      )} 
      priority
    />
  )
}
