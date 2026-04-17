"use client"

import { useEffect, useRef, useState } from "react"

export function useCountUp(target: number, { duration = 1400, enabled = true }: { duration?: number; enabled?: boolean } = {}) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!enabled || !ref.current || started.current) return
    const el = ref.current
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const from = 0
            const to = target
            const step = (now: number) => {
              const progress = Math.min(1, (now - start) / duration)
              const eased = 1 - Math.pow(1 - progress, 3)
              setValue(Math.round(from + (to - from) * eased))
              if (progress < 1) requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
          }
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration, enabled])

  // If animation has started but target changes (rare: stats update), snap to new value
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (started.current && value !== target) {
      setValue(target)
    }
  }, [target])

  return { value, ref }
}
