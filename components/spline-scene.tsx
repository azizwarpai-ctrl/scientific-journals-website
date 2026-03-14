"use client"

import dynamic from 'next/dynamic'

// Dynamically import Spline without SSR. This prevents hydration mismatches and uses the 
// official Spline React component for perfect animations and rendering quality.
const Spline = dynamic(() => import('@splinetool/react-spline/next'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-transparent" />
})

export function SplineScene() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <Spline scene="https://prod.spline.design/UEU7hUtqsbqKkshk/scene.splinecode" />
    </div>
  )
}
