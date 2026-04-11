"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, ArrowRight, Layers, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import { parseCustomBlockHtml } from "@/src/features/journals/utils/custom-block-parser"
import { motion, AnimatePresence } from "framer-motion"

interface JournalInfoCarouselProps {
  journalId: string
}

export function JournalInfoCarousel({ journalId }: JournalInfoCarouselProps) {
  const { data, isLoading } = useGetCustomBlocks(journalId)
  
  // Embla setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: "start",
    loop: true,
    skipSnaps: false,
    dragFree: true
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi])

  // Parse blocks into structured cards
  const cards = useMemo(() => {
    if (!data?.blocks) return []
    return data.blocks.map(block => parseCustomBlockHtml(block.content, block.name))
  }, [data?.blocks])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl border border-border/40" />
          ))}
        </div>
      </div>
    )
  }

  if (cards.length === 0) return null

  return (
    <div className="w-full space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Journal Highlights</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Explore key information and updates</p>
          </div>
        </div>

        {cards.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-border/60 hover:bg-muted/50 hidden md:flex"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-border/60 hover:bg-muted/50 hidden md:flex"
              onClick={scrollNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Carousel Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {cards.map((card, index) => (
            <div 
              key={index} 
              className="flex-[0_0_100%] min-w-0 pl-4 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col group">
                  {/* Card Image Support */}
                  {card.image && (
                    <div className="relative h-44 w-full overflow-hidden border-b border-border/40">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  )}

                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                       {!card.image && (
                         <div className="p-1.5 rounded-md bg-primary/5 border border-primary/10">
                           <Info className="h-3.5 w-3.5 text-primary/70" />
                         </div>
                       )}
                       <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {card.title}
                      </h3>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 flex-1">
                      {card.description}
                    </p>

                    {card.link && (
                      <div className="mt-6 pt-6 border-t border-border/40">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between text-primary hover:text-primary hover:bg-primary/5 p-0 sm:px-3 h-8 rounded-lg group/btn" 
                          asChild
                        >
                          <Link href={card.link}>
                            <span className="text-xs font-semibold">Learn More</span>
                            <ArrowRight className="h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === selectedIndex 
                  ? "w-8 bg-primary" 
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
