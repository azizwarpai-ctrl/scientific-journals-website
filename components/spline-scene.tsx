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
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden [&_a]:!hidden" aria-hidden="true" role="presentation">
      {/* Inner container scales slightly to prevent edge aliasing, while CSS hides the watermark */}
      <div className="absolute inset-0 w-full h-full scale-[1.05] origin-center pointer-events-none">
        <Spline scene="https://prod.spline.design/UEU7hUtqsbqKkshk/scene.splinecode" />
      </div>
    </div>
  )
}
