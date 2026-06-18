"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { useAudioPlayerContext } from "./audio-player-context"

interface AudioPlayerProps {
  src: string
  durationSeconds?: number | null
  variant?: "compact" | "full"
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AudioPlayer({
  src,
  durationSeconds,
  variant = "compact",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(durationSeconds ?? 0)
  const [muted, setMuted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const ctx = useAudioPlayerContext()

  const stop = useCallback(() => {
    const el = audioRef.current
    if (el) {
      el.pause()
    }
    setPlaying(false)
  }, [])

  useEffect(() => {
    const cleanup = ctx?.register(stop)
    return cleanup
  }, [ctx, stop])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onLoadedMetadata = () => {
      if (Number.isFinite(el.duration)) {
        setDuration(el.duration)
      }
    }
    const onEnded = () => {
      setPlaying(false)
      setExpanded(false)
    }

    el.addEventListener("timeupdate", onTimeUpdate)
    el.addEventListener("loadedmetadata", onLoadedMetadata)
    el.addEventListener("ended", onEnded)
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate)
      el.removeEventListener("loadedmetadata", onLoadedMetadata)
      el.removeEventListener("ended", onEnded)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return

    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      ctx?.notifyPlay(stop)
      el.play().catch(() => {})
      setPlaying(true)
      setExpanded(true)
    }
  }, [playing, ctx, stop])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current
    if (!el) return
    const time = parseFloat(e.target.value)
    el.currentTime = time
    setCurrentTime(time)
  }, [])

  const toggleMute = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-2" role="group" aria-label="Audio player">
        <audio ref={audioRef} src={src} preload="metadata" />
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause audio" : "Play audio"}
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5 ml-0.5" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 pr-1">
            <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap w-8 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="relative w-24">
              <div className="h-1 rounded-full bg-muted-foreground/20">
                <div
                  className="h-1 rounded-full bg-primary transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Seek audio"
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap w-8">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // variant === "full"
  return (
    <div
      className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3"
      role="group"
      aria-label="Audio player"
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause audio" : "Play audio"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        <div className="flex-1 space-y-1">
          <div className="relative">
            <div className="h-1.5 rounded-full bg-muted-foreground/20">
              <div
                className="h-1.5 rounded-full bg-primary transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek audio"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0"
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
