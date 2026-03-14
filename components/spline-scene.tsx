"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import SplineLoader from "@splinetool/loader"

/**
 * Three.js powered Spline Scene
 * Renders the 3D universe model anchored to the lower-right corner
 * of its parent container as a non-interactive background element.
 */
export function SplineScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // --- Camera ---
    const width = container.clientWidth
    const height = container.clientHeight
    const camera = new THREE.OrthographicCamera(
      width / -2, width / 2,
      height / 2, height / -2,
      -100000, 100000
    )
    camera.position.set(4.94, 36.42, 2291.96)
    camera.quaternion.setFromEuler(new THREE.Euler(0, 0, 0))
    // Zoom in to make the figure larger
    camera.zoom = 2.5
    camera.updateProjectionMatrix()

    // --- Scene ---
    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#000319")

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setClearAlpha(1)
    container.appendChild(renderer.domElement)

    // --- Orbit Controls ---
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.125
    controls.enableZoom = false // Prevent scroll-to-zoom so page scrolling works normally

    // --- Load Spline Scene ---
    const loader = new SplineLoader()
    loader.load(
      "https://prod.spline.design/UEU7hUtqsbqKkshk/scene.splinecode",
      (splineScene) => {
        scene.add(splineScene)
      }
    )

    // --- Animation loop ---
    let animationId: number
    function animate() {
      animationId = requestAnimationFrame(animate)
      controls.update() // required for damping
      renderer.render(scene, camera)
    }
    animate()

    // --- Resize handler ---
    function onResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight

      camera.left = w / -2
      camera.right = w / 2
      camera.top = h / 2
      camera.bottom = h / -2
      camera.updateProjectionMatrix()

      renderer.setSize(w, h)
    }
    window.addEventListener("resize", onResize)

    // --- Cleanup ---
    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(animationId)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      aria-hidden="true"
    />
  )
}
