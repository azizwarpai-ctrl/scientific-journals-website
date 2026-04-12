"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import { motion, AnimatePresence } from "framer-motion"

interface JournalInfoCarouselProps {
  journalId: string
}

export function JournalInfoCarousel({ journalId }: JournalInfoCarouselProps) {
  const { data, isLoading } = useGetCustomBlocks(journalId)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const cards = data?.blocks || []

  // Ensure currentIndex is always within bounds when cards list changes
  useEffect(() => {
    if (cards.length > 0 && currentIndex >= cards.length) {
      setCurrentIndex(Math.max(0, cards.length - 1))
    }
  }, [cards.length, currentIndex])

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

  // Helper to (re)start the autoplay timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (cards.length <= 1 || isHovered) return

    timerRef.current = setInterval(() => {
      nextSlide()
    }, 5000)
  }, [cards.length, isHovered, nextSlide])

  // Reset timer on manual navigation or hover
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Auto-play logic: re-arms via startTimer helper
  useEffect(() => {
    startTimer()
    return () => resetTimer()
  }, [startTimer, resetTimer])

  const goToSlide = useCallback((index: number) => {
    if (index === currentIndex) return
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }, [currentIndex])

  // Slide animation variants
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
    }),
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <div className="h-5 w-40 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="p-5 space-y-3">
          <div className="h-40 w-full bg-muted animate-pulse rounded-xl" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded-md" />
          <div className="h-3 w-full bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    )
  }

  if (cards.length === 0) return null

  const currentCard = cards[currentIndex]

  return (
    <div 
      className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Section Header */}
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider">
                Highlights
              </h3>
            </div>
          </div>

          {cards.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { prevSlide(); startTimer(); }}
                className="p-1.5 rounded-full border border-border/60 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                aria-label="Previous highlight"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { nextSlide(); startTimer(); }}
                className="p-1.5 rounded-full border border-border/60 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                aria-label="Next highlight"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Carousel Content */}
      <div className="relative flex-1 overflow-hidden min-h-[320px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "anticipate" }}
            className="absolute inset-0 w-full"
          >
            <div className="p-5 flex flex-col h-full">
              {/* Card Image */}
              {currentCard.image && (
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border/40 bg-muted/20 mb-4 shadow-inner">
                  <Image
                    src={currentCard.image}
                    alt={currentCard.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
              )}

              {/* Text Content */}
              <div className="flex-1">
                <h4 className="text-base font-bold text-foreground leading-snug mb-2 tracking-tight">
                  {currentCard.title}
                </h4>

                <p className="text-[13px] text-muted-foreground/90 leading-relaxed line-clamp-4 whitespace-pre-line font-medium italic">
                  &ldquo;{currentCard.description}&rdquo;
                </p>
              </div>

              {/* Action */}
              {currentCard.link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-6 justify-between text-[11px] h-9 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white transition-all group/btn font-bold uppercase tracking-wider"
                  asChild
                >
                  <Link href={currentCard.link} target="_blank" rel="noopener noreferrer">
                    <span>Explore More</span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      {cards.length > 1 && (
        <div className="flex justify-center items-center gap-2 px-5 py-4 border-t border-border/40 bg-muted/10 flex-shrink-0">
          {cards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { goToSlide(idx); startTimer(); }}
              aria-label={`Go to highlight ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx
                  ? "w-8 bg-primary shadow-sm"
                  : "w-1.5 bg-muted-foreground/20 hover:bg-primary/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

