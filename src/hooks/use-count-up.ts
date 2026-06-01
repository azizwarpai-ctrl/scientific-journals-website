"use client"

import { useEffect, useRef, useState } from "react"

export function useCountUp(target: number, { duration = 1400, enabled = true }: { duration?: number; enabled?: boolean } = {}) {
  const [value, setValue] = useState(0)
  const [prevTarget, setPrevTarget] = useState(target)
  // Dual tracking: ref guards the animation loop (must not cause re-renders);
  // state mirrors it so we can read the flag safely during the render phase.
  const startedRef = useRef(false)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // "Adjust state during rendering" — if the target changes after animation has
  // started (rare: live stats update), snap to the new value without an effect.
  if (target !== prevTarget) {
    setPrevTarget(target)
    if (hasStarted) {
      setValue(target)
    }
  }

  useEffect(() => {
    if (!enabled || !ref.current || startedRef.current) return
    const el = ref.current
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true
            setHasStarted(true)
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

  return { value, ref }
}
