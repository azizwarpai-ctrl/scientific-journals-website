"use client"

import { createContext, useCallback, useContext, useRef } from "react"

type StopFn = () => void

interface AudioPlayerContextValue {
  register: (stop: StopFn) => () => void
  notifyPlay: (stop: StopFn) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const activeRef = useRef<StopFn | null>(null)

  const register = useCallback((stop: StopFn) => {
    return () => {
      if (activeRef.current === stop) {
        activeRef.current = null
      }
    }
  }, [])

  const notifyPlay = useCallback((stop: StopFn) => {
    if (activeRef.current && activeRef.current !== stop) {
      activeRef.current()
    }
    activeRef.current = stop
  }, [])

  return (
    <AudioPlayerContext.Provider value={{ register, notifyPlay }}>
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayerContext() {
  return useContext(AudioPlayerContext)
}
