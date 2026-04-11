"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import { parseCustomBlockHtml } from "@/src/features/journals/utils/custom-block-parser"
import { motion, AnimatePresence } from "framer-motion"

interface JournalInfoCarouselProps {
  journalId: string
}

export function JournalInfoCarousel({ journalId }: JournalInfoCarouselProps) {
  const { data, isLoading } = useGetCustomBlocks(journalId)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  // Parse blocks into structured cards
  const cards = (() => {
    if (!data?.blocks) return []
    return data.blocks.map(block => parseCustomBlockHtml(block.content, block.name))
  })()

  // Auto-play: rotate every 6 seconds
  useEffect(() => {
    if (cards.length <= 1) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrentIndex(prev => (prev + 1) % cards.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [currentIndex, cards.length])

  const nextSlide = useCallback(() => {
    if (cards.length <= 1) return
    setDirection(1)
    setCurrentIndex(prev => (prev + 1) % cards.length)
  }, [cards.length])

  const prevSlide = useCallback(() => {
    if (cards.length <= 1) return
    setDirection(-1)
    setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length)
  }, [cards.length])

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }, [currentIndex])

  // Slide animation variants
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <div className="h-5 w-40 bg-muted animate-pulse rounded-md" />
          <div className="h-3 w-56 bg-muted animate-pulse rounded-md mt-2" />
        </div>
        <div className="p-5 space-y-3">
          <div className="h-40 w-full bg-muted animate-pulse rounded-xl" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded-md" />
          <div className="h-3 w-full bg-muted animate-pulse rounded-md" />
          <div className="h-3 w-2/3 bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    )
  }

  if (cards.length === 0) return null

  const currentCard = cards[currentIndex]
  const hasContent = currentCard.description && currentCard.description !== "No description available."

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Section Header with Navigation */}
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Journal Highlights
              </h3>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Key information &amp; updates
              </p>
            </div>
          </div>

          {/* Navigation Arrows */}
          {cards.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevSlide}
                className="p-1.5 rounded-full border border-border/60 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
                aria-label="Previous highlight"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={nextSlide}
                className="p-1.5 rounded-full border border-border/60 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
                aria-label="Next highlight"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Carousel Content */}
      <div className="relative overflow-hidden" style={{ minHeight: "220px" }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full"
          >
            <div className="p-5 space-y-4">
              {/* Card Image */}
              {currentCard.image && (
                <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-border/40 bg-muted/20">
                  <Image
                    src={currentCard.image}
                    alt={currentCard.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
              )}

              {/* Title */}
              <h4 className="text-sm font-bold text-foreground leading-snug">
                {currentCard.title}
              </h4>

              {/* Description */}
              {hasContent && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-line">
                  {currentCard.description}
                </p>
              )}

              {/* Link Button */}
              {currentCard.link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs h-8 rounded-lg border-primary/20 text-primary hover:bg-primary/5 hover:text-primary group/btn"
                  asChild
                >
                  <Link href={currentCard.link} target="_blank" rel="noopener noreferrer">
                    <span className="font-medium">View Details</span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot Indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center items-center gap-2 px-5 py-3 border-t border-border/40 bg-muted/10">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to highlight ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx
                  ? "w-7 bg-primary"
                  : "w-1.5 bg-muted-foreground/25 hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
