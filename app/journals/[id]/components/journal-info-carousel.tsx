"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useCallback, memo, useRef, useMemo } from "react"
import { ExternalLink, Sparkles, ChevronLeft, ChevronRight, Bug, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HighlightItem {
  image?: string
  title: string
  description: string
  link?: string
}

interface JournalInfoCarouselProps {
  journalId: string
  /** Enable the debug panel (auto-enabled in development) */
  debug?: boolean
}

// ─── Data resolver ────────────────────────────────────────────────────────────
// useGetCustomBlocks can return data wrapped in different shapes depending on
// the Hono RPC layer. This function tries every common shape so no items are
// silently dropped due to a wrong accessor.
//
// Shapes handled:
//   { blocks: [...] }              ← direct (most common)
//   { data: { blocks: [...] } }    ← wrapped once by Hono success response
//   { data: [...] }                ← array directly on data key
//   { highlights: [...] }          ← OJS-native naming
//   [...]                          ← bare array

function resolveItems(raw: unknown): HighlightItem[] {
  if (!raw) return []

  let candidates: unknown[] = []
  if (Array.isArray(raw)) {
    candidates = raw
  } else if (typeof raw === "object" && raw !== null) {
    const r = raw as Record<string, unknown>
    if (Array.isArray(r.blocks)) candidates = r.blocks
    else if (Array.isArray(r.highlights)) candidates = r.highlights
    else if (Array.isArray(r.items)) candidates = r.items
    else if (r.data) {
      if (Array.isArray(r.data)) candidates = r.data
      else if (typeof r.data === "object" && r.data !== null) {
        const d = r.data as Record<string, unknown>
        if (Array.isArray(d.blocks)) candidates = d.blocks
        else if (Array.isArray(d.highlights)) candidates = d.highlights
      }
    }
  }

  // Filter and validate items defensively
  return candidates.filter((item): item is HighlightItem => {
    return (
      item !== null &&
      typeof item === "object" &&
      typeof (item as any).title === "string" &&
      (item as any).title.trim() !== "" &&
      typeof (item as any).description === "string" &&
      (item as any).description.trim() !== ""
    )
  })
}

// ─── HighlightCard ────────────────────────────────────────────────────────────
// Defined OUTSIDE the parent component — if defined inside, React creates a new
// component type on every render, forcing Embla to lose its DOM reference and
// the carousel never scrolls.

const HighlightCard = memo(function HighlightCard({ data }: { data: HighlightItem }) {
  const linkInfo = (() => {
    if (!data.link) return null
    // Support relative paths (starting with / or .)
    if (data.link.startsWith("/") || data.link.startsWith(".")) {
      return { href: data.link, isExternal: false }
    }
    try {
      const u = new URL(data.link)
      const isExternal = u.protocol === "http:" || u.protocol === "https:"
      return isExternal ? { href: data.link, isExternal: true } : null
    } catch {
      // Treat as relative if it doesn't look like a protocol-led URL but contains safe path chars
      // Broadened to allow query params and fragments: ? # = & % +
      if (/^[a-zA-Z0-9_\-\/.\?#=&%+]+$/.test(data.link)) {
        return { href: data.link, isExternal: false }
      }
      return null
    }
  })()

  const safeLink = linkInfo?.href
  const isExternal = linkInfo?.isExternal

  return (
    <div className="flex flex-col h-full p-5 select-none">
      {data.image && (
        <div
          className="relative w-full rounded-xl overflow-hidden border border-border/40 bg-muted/20 mb-4 shadow-inner flex-shrink-0"
          style={{ aspectRatio: "16/9" }}
        >
          <Image
            src={data.image}
            alt={data.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            draggable={false}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <h4 className="text-[15px] font-bold text-foreground leading-snug mb-2 tracking-tight line-clamp-2">
          {data.title}
        </h4>
        <p
          className="text-[13px] text-muted-foreground/90 leading-relaxed font-medium italic flex-1 overflow-hidden"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: data.image ? 3 : 8,
            WebkitBoxOrient: "vertical",
          }}
        >
          &ldquo;{data.description}&rdquo;
        </p>
      </div>

      {safeLink && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 justify-between text-[11px] h-9 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all group/btn font-bold uppercase tracking-wider flex-shrink-0"
          asChild
        >
          <Link
            href={safeLink}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
          >
            <span>Explore More</span>
            {isExternal && (
              <ExternalLink className="h-3 w-3 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
            )}
          </Link>
        </Button>
      )}
    </div>
  )
})

// ─── Debug Panel ──────────────────────────────────────────────────────────────
// Renders only in development. Shows the raw API response shape so you can
// immediately see which key holds your blocks array.

function DebugPanel({ raw, items, debug }: { raw: unknown; items: HighlightItem[]; debug?: boolean }) {
  const [open, setOpen] = useState(true)
  const isDev = process.env.NODE_ENV === "development"

  // Respect explicit debug prop or dev mode
  if (!debug && !isDev) return null

  return (
    <div className="absolute top-2 right-2 z-50 max-w-[260px] text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-400 text-black rounded shadow"
      >
        <Bug className="h-3 w-3" />
        Debug {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-1 rounded border border-yellow-400 bg-black/90 text-yellow-300 text-[10px] font-mono p-2 overflow-auto max-h-56 space-y-1">
          <p className="text-yellow-200 font-bold">Resolved items: {items.length}</p>
          <p className="text-yellow-200 font-bold">Raw shape keys:</p>
          <pre className="whitespace-pre-wrap break-all text-[9px]">
            {JSON.stringify(
              typeof raw === "object" && raw !== null
                ? Object.keys(raw as object)
                : raw,
              null, 2
            )}
          </pre>
          <p className="text-yellow-200 font-bold">Raw data (truncated):</p>
          <pre className="whitespace-pre-wrap break-all text-[9px]">
            {JSON.stringify(raw, null, 2).slice(0, 600)}
          </pre>
          {items.length <= 1 && (
            <div className="bg-red-900 text-red-200 p-1.5 rounded mt-1 text-[9px] leading-relaxed">
              ⚠ Only {items.length} item(s) found.
              {"\n"}Check if the API returns more blocks — the raw shape above
              shows all available keys. Update resolveItems() if the correct key
              is missing, or fix the API query if it has a LIMIT.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CarouselSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col">
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent flex-shrink-0">
        <div className="h-5 w-40 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="p-5 h-[380px] space-y-4">
        <div className="h-40 w-full bg-muted animate-pulse rounded-xl" />
        <div className="h-6 w-3/4 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-full bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-5/6 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="h-[40px] border-t border-border/20 flex justify-center items-center gap-1.5 bg-muted/10">
        <div className="h-1.5 w-6 bg-muted/20 animate-pulse rounded-full" />
        <div className="h-1.5 w-1.5 bg-muted/20 animate-pulse rounded-full" />
        <div className="h-1.5 w-1.5 bg-muted/20 animate-pulse rounded-full" />
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

const AUTOPLAY_DELAY_MS = 4500

export function JournalInfoCarousel({ journalId, debug = false }: JournalInfoCarouselProps) {
  const { data: rawData, isLoading } = useGetCustomBlocks(journalId)

  // Resolve items defensively — handles all common API response shapes
  const items = useMemo(() => resolveItems(rawData), [rawData])

  // Dev-only: print a detailed report to the console the moment data arrives
  useEffect(() => {
    if (rawData == null || process.env.NODE_ENV === "production") return
    console.group("[JournalInfoCarousel] data diagnostic")
    console.log("journalId:", journalId)
    console.log("raw response:", rawData)
    console.log(`resolved items (${items.length}):`, items)
    if (items.length <= 1) {
      console.warn(
        `⚠ Only ${items.length} item(s) resolved.\n`,
        "If the OJS database has more highlights, one of these is wrong:\n",
        "  1. The API query has LIMIT 1 or filters by something unexpected.\n",
        "  2. The response shape doesn't match any key in resolveItems().\n",
        "  3. The OJS sync job only imported one highlight.\n",
        "Check the raw response above and fix accordingly."
      )
    }
    console.groupEnd()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData])

  // ── Embla ──────────────────────────────────────────────────────────────────
  // CRITICAL: The element with `emblaRef` must have:
  //   1. `overflow-hidden`  — clips slides that are translated out of view
  //   2. An explicit height — without this, Embla can't measure positions and
  //      the slide row overflows downward; nothing visually scrolls.
  //
  // The Autoplay plugin MUST be stored in a ref so the same instance is reused
  // across renders. Creating it inline (Autoplay({…})) produces a new object
  // every render, which causes useEmblaCarousel's plugin-change effect to fire
  // continuously — triggering reInit, resetting the autoplay timer before it
  // can elapse, and making the carousel appear frozen.
  const autoplayPlugin = useRef(
    Autoplay({ delay: AUTOPLAY_DELAY_MS, stopOnInteraction: false })
  )
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [autoplayPlugin.current]
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [announcement, setAnnouncement] = useState("")
  const [progressKey, setProgressKey] = useState(0) // Used to reset CSS animation on slide change

  const scrollPrev = useCallback(() => { emblaApi?.scrollPrev() }, [emblaApi])
  const scrollNext = useCallback(() => { emblaApi?.scrollNext() }, [emblaApi])
  const scrollTo = useCallback((i: number) => { emblaApi?.scrollTo(i) }, [emblaApi])
  const togglePlay = useCallback(() => setIsPlaying(v => !v), [])

  // Sync selectedIndex with Embla and reset progress bar animation
  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap()
      setSelectedIndex(index)
      setProgressKey(k => k + 1) // Resets the CSS animation to 0
      
      // Announcement for screen readers
      const currentItem = items[index]
      if (currentItem) {
        setAnnouncement(`Slide ${index + 1} of ${items.length}: ${currentItem.title}`)
      }
    }
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    onSelect() // Initial set
    
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, items])

  // Sync play/pause state with Embla Autoplay plugin
  useEffect(() => {
    if (!emblaApi) return
    const autoplay = emblaApi.plugins().autoplay
    if (!autoplay) return

    if (isPlaying) {
      autoplay.play()
    } else {
      autoplay.stop()
    }
  }, [emblaApi, isPlaying])

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) return <CarouselSkeleton />

  const isSingle = items.length === 1
  const showDebug = debug || process.env.NODE_ENV !== "production"

  return (
    <div
      className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col"
      role="region"
      aria-roledescription="carousel"
      aria-label="Journal Highlights"
      onPointerEnter={() => setIsPlaying(false)}
      onPointerLeave={() => setIsPlaying(true)}
      onFocusCapture={() => setIsPlaying(false)}
      onBlurCapture={(e) => {
        // Only resume if focus left the carousel entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsPlaying(true)
        }
      }}
    >
      {/* Visually hidden live region for slide announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Dev debug panel — shows even if items.length === 0 */}
      {showDebug && (
        <DebugPanel raw={rawData} items={items} debug={debug} />
      )}

      {items.length === 0 ? (
        <div className="h-[150px] flex items-center justify-center text-muted-foreground bg-muted/5 italic text-sm">
          No highlights available to display.
        </div>
      ) : (
        <>

          {/* ── Header ── */}
          <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">
                Highlights
              </h3>
              {!isSingle && (
                <span className="text-xs text-muted-foreground/60 font-medium tabular-nums">
                  {selectedIndex + 1}&thinsp;/&thinsp;{items.length}
                </span>
              )}
            </div>

            {!isSingle && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mr-1"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={scrollPrev}
                  aria-label="Previous highlight"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  aria-label="Next highlight"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Autoplay progress bar ── */}
          {!isSingle && (
            <div className="h-[2px] w-full bg-border/30 flex-shrink-0 overflow-hidden relative">
              <div
                key={progressKey}
                className="absolute top-0 left-0 h-full bg-primary/60 outline-none"
                style={{
                  width: isPlaying ? "100%" : "0%",
                  animation: isPlaying ? `progress-fill ${AUTOPLAY_DELAY_MS}ms linear forwards` : "none"
                }}
              />
              <style>{`
                @keyframes progress-fill {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}</style>
            </div>
          )}

          {/* ── Carousel body ──────────────────────────────────────────────────────
          Single item: skip Embla entirely (no wasted JS, no layout thrash).
          Multi item:  emblaRef container has `overflow-hidden h-[380px]` —
                       both are required for clipping to work.
      ─────────────────────────────────────────────────────────────────────── */}
          {isSingle ? (
            <div className="h-[380px]">
              <HighlightCard data={items[0]} />
            </div>
          ) : (
            <>
              {/* Embla viewport — MUST be overflow-hidden + fixed height */}
              <div ref={emblaRef} className="overflow-hidden h-[380px] flex-shrink-0">
                {/* Embla container — translated by Embla to scroll */}
                <div className="flex h-full">
                  {items.map((item: HighlightItem, index: number) => (
                    <div
                      key={index}
                      // flex-[0_0_100%] = one full viewport width per slide
                      // min-w-0         = prevent flex blowout beyond 100%
                      className="flex-[0_0_100%] min-w-0 h-full"
                    >
                      <HighlightCard data={item} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Dot indicators ── */}
              <div className="flex justify-center items-center gap-1.5 px-5 py-3 bg-muted/10 border-t border-border/20 flex-shrink-0">
                {items.map((_: HighlightItem, index: number) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => scrollTo(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    className={[
                      "rounded-full transition-all duration-300",
                      index === selectedIndex
                        ? "w-6 h-1.5 bg-primary shadow-sm"
                        : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-primary/50",
                    ].join(" ")}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
