"use client"

import { useState, useEffect, useCallback, memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { ExternalLink, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import useEmblaCarousel from "embla-carousel-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HighlightItem {
  image?: string
  title: string
  description: string
  link?: string
}

interface JournalInfoCarouselProps {
  journalId: string
}

// ─── HighlightCard ────────────────────────────────────────────────────────────
// Defined OUTSIDE the parent component so React never recreates the component
// type between renders — recreating it would force Embla to re-measure the DOM.

const HighlightCard = memo(function HighlightCard({ data }: { data: HighlightItem }) {
  return (
    <div className="flex flex-col h-full p-5 select-none">
      {data.image && (
        <div className="relative w-full rounded-xl overflow-hidden border border-border/40 bg-muted/20 mb-4 shadow-inner flex-shrink-0" style={{ aspectRatio: "16/9" }}>
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

      {(() => {
        if (!data.link) return null
        try {
          const url = new URL(data.link)
          if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
          
          return (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 justify-between text-[11px] h-9 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all group/btn font-bold uppercase tracking-wider flex-shrink-0"
              asChild
            >
              <Link href={data.link} target="_blank" rel="noopener noreferrer">
                <span>Explore More</span>
                <ExternalLink className="h-3 w-3 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
              </Link>
            </Button>
          )
        } catch {
          return null
        }
      })()}
    </div>
  )
})

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CarouselSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col">
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent flex-shrink-0">
        <div className="h-5 w-40 bg-muted animate-pulse rounded-md" />
      </div>
      {/* Body container matching h-[380px] */}
      <div className="p-5 h-[380px] space-y-4">
        <div className="h-40 w-full bg-muted animate-pulse rounded-xl" />
        <div className="h-6 w-3/4 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-full bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-5/6 bg-muted animate-pulse rounded-md" />
      </div>
      {/* Footer container matching dots area */}
      <div className="h-[40px] border-t border-border/20 flex justify-center items-center gap-1.5 px-5 py-3 bg-muted/10">
        <div className="h-1.5 w-6 bg-muted/20 animate-pulse rounded-full" />
        <div className="h-1.5 w-1.5 bg-muted/20 animate-pulse rounded-full" />
        <div className="h-1.5 w-1.5 bg-muted/20 animate-pulse rounded-full" />
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

const AUTOPLAY_DELAY = 4500

export function JournalInfoCarousel({ journalId }: JournalInfoCarouselProps) {
  const { data, isLoading } = useGetCustomBlocks(journalId)
  const items: HighlightItem[] = data?.blocks ?? []

  // ── Embla setup ──
  // BUG FIX: The `overflow-hidden` container (emblaRef) MUST have a fixed or
  // computed height. Previously it was wrapped in `flex-1` without `min-h-0`,
  // meaning Embla's container had infinite/unconstrained height and slides
  // overflowed instead of clipping. We now give it an explicit pixel height.
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [progress, setProgress] = useState(0)

  // ── Callbacks ──
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  // ── Sync state with Embla events ──
  // BUG FIX: Always call `emblaApi.off()` in cleanup to prevent stale listeners
  // accumulating across HMR / re-renders.
  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }

    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    onSelect() // sync on mount

    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi])

  // ── Autoplay with progress bar ──
  useEffect(() => {
    if (!emblaApi || items.length <= 1) return

    setProgress(0)
    const tickInterval = 50 // ms per progress tick
    const ticks = AUTOPLAY_DELAY / tickInterval
    let tick = 0

    const progressTimer = setInterval(() => {
      tick++
      setProgress(tick / ticks)
      if (tick >= ticks) {
        tick = 0
        setProgress(0)
        emblaApi.scrollNext()
      }
    }, tickInterval)

    // Reset progress whenever the user manually navigates
    const onSelect = () => { tick = 0; setProgress(0) }
    emblaApi.on("select", onSelect)

    return () => {
      clearInterval(progressTimer)
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi, items.length])

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) return <CarouselSkeleton />
  if (items.length === 0) return null

  const isSingle = items.length === 1

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
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
              {selectedIndex + 1} / {items.length}
            </span>
          )}
        </div>

        {/* Prev / Next arrows — only shown for multi-item carousels */}
        {!isSingle && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous highlight"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next highlight"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Autoplay progress bar */}
      {!isSingle && (
        <div className="h-[2px] w-full bg-border/30 flex-shrink-0">
          <div
            className="h-full bg-primary/60 transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* ─ Carousel body ─────────────────────────────────────────────────────
          KEY FIX: The emblaRef div gets an explicit height via `h-[380px]`.
          Without this, the container has no bounding box and Embla cannot
          clip slides — they overflow downward and nothing visually scrolls.
          The `overflow-hidden` on this element is what makes slides hide when
          they're translated out of view.
      ──────────────────────────────────────────────────────────────────────── */}
      {isSingle ? (
        <div className="h-[380px]">
          <HighlightCard data={items[0]} />
        </div>
      ) : (
        <>
          <div ref={emblaRef} className="overflow-hidden h-[380px]">
            <div className="flex h-full">
              {items.map((item, index) => (
                <div
                  key={index}
                  // `flex-[0_0_100%]` makes each slide exactly the container
                  // width. `min-w-0` prevents flex children from blowing out.
                  className="flex-[0_0_100%] min-w-0 h-full"
                >
                  <HighlightCard data={item} />
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center items-center gap-1.5 px-5 py-3 bg-muted/10 border-t border-border/20 flex-shrink-0">
            {items.map((_, index) => (
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
    </div>
  )
}