"use client"

import { useEffect, useRef, type ReactNode } from "react"

interface GSAPWrapperProps {
  children: ReactNode
  animation?: "fadeIn" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | "scale" | "none"
  delay?: number
  duration?: number
  className?: string
}

export function GSAPWrapper({
  children,
  animation = "fadeIn",
  delay = 0,
  duration = 0.8,
  className = "",
}: GSAPWrapperProps) {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadGSAP = async () => {
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")

      gsap.registerPlugin(ScrollTrigger)

      if (!elementRef.current || animation === "none") return

      const animations: Record<string, any> = {
        fadeIn: { opacity: 0 },
        slideUp: { opacity: 0, y: 50 },
        slideDown: { opacity: 0, y: -50 },
        slideLeft: { opacity: 0, x: 50 },
        slideRight: { opacity: 0, x: -50 },
        scale: { opacity: 0, scale: 0.8 },
      }

      const initialState = animations[animation] || animations.fadeIn

      gsap.from(elementRef.current, {
        ...initialState,
        duration,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: elementRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      })
    }

    loadGSAP()
  }, [animation, delay, duration])

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  )
}
