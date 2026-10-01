"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export interface UseTabSyncOptions<T extends string> {
  initialTab: T
  journalId: string
  buildPath: (id: string, tab: T) => string
}

export interface UseTabSyncReturn<T extends string> {
  activeTab: T
  setActiveTab: (tab: T) => void
  handleTabChange: (value: string) => void
}

/**
 * Reconciles active tab state with route prop updates (such as browser back/forward)
 * during render, and synchronizes tab transitions with soft router push navigation.
 */
export function useTabSync<T extends string>({
  initialTab,
  journalId,
  buildPath,
}: UseTabSyncOptions<T>): UseTabSyncReturn<T> {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<T>(initialTab)
  const [prevInitialTab, setPrevInitialTab] = useState<T>(initialTab)

  // Synchronously reconcile activeTab when the prop changes (browser back/forward,
  // or navigating between tabs where each tab is its own route).
  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab)
    setActiveTab(initialTab)
  }

  const handleTabChange = (value: string) => {
    const next = value as T
    if (next === activeTab) return
    setActiveTab(next)
    router.push(buildPath(journalId, next), { scroll: false })
  }

  return {
    activeTab,
    setActiveTab,
    handleTabChange,
  }
}
