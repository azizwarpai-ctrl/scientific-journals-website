"use client"

import dynamic from 'next/dynamic'

// Dynamically import Spline without SSR. This prevents hydration mismatches and uses the 
// official Spline React component for perfect animations and rendering quality.
const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-transparent" />
})

export function SplineScene() {
  return (
    // Outer container hides Spline watermark via overflow-hidden + inner scaling.
    // No light-mode color tricks needed: hero section is always dark.
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-90" aria-hidden="true" role="presentation">
      {/* Inner container scales slightly larger to push the watermark perfectly off-screen */}
      <div className="absolute top-0 left-0 w-[110%] h-[110%] pointer-events-none">
        <Spline scene="https://prod.spline.design/UEU7hUtqsbqKkshk/scene.splinecode" />
      </div>
    </div>
  )
}
