"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronDown, ChevronUp, ArrowUpRight, Sparkles, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import { parseCustomBlockHtml } from "@/src/features/journals/utils/custom-block-parser"
import { motion, AnimatePresence } from "framer-motion"

interface JournalInfoCarouselProps {
  journalId: string
}

export function JournalInfoCarousel({ journalId }: JournalInfoCarouselProps) {
  const { data, isLoading } = useGetCustomBlocks(journalId)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  // Parse blocks into structured cards
  const cards = useMemo(() => {
    if (!data?.blocks) return []
    return data.blocks.map(block => parseCustomBlockHtml(block.content, block.name))
  }, [data?.blocks])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <div className="h-5 w-40 bg-muted animate-pulse rounded-md" />
          <div className="h-3 w-56 bg-muted animate-pulse rounded-md mt-2" />
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 space-y-2.5">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded-md" />
              <div className="h-3 w-full bg-muted animate-pulse rounded-md" />
              <div className="h-3 w-2/3 bg-muted animate-pulse rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (cards.length === 0) return null

  const toggleExpand = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index)
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Section Header */}
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
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
      </div>

      {/* Accordion-style Cards */}
      <div className="divide-y divide-border/40">
        {cards.map((card, index) => {
          const isExpanded = expandedIndex === index
          const hasContent = card.description && card.description !== "No description available."

          return (
            <div key={index} className="group">
              {/* Accordion Header */}
              <button
                onClick={() => toggleExpand(index)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors duration-200"
                aria-expanded={isExpanded}
                aria-controls={`highlight-panel-${index}`}
              >
                {/* Thumbnail (small) */}
                {card.image && (
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-border/50 flex-shrink-0 mt-0.5">
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                )}

                {/* Title & indicator */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors duration-200">
                    {card.title}
                  </h4>
                  {!isExpanded && hasContent && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed">
                      {card.description}
                    </p>
                  )}
                </div>

                {/* Expand/Collapse chevron */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`p-1 rounded-md transition-colors duration-200 ${
                    isExpanded 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground/50 group-hover:text-muted-foreground"
                  }`}>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content Panel */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    id={`highlight-panel-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Full image display */}
                      {card.image && (
                        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border/40">
                          <Image
                            src={card.image}
                            alt={card.title}
                            fill
                            className="object-contain bg-muted/30"
                            sizes="(max-width: 768px) 100vw, 400px"
                          />
                        </div>
                      )}

                      {/* Description text */}
                      {hasContent && (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {card.description}
                        </p>
                      )}

                      {/* Link button */}
                      {card.link && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between text-xs h-8 rounded-lg border-primary/20 text-primary hover:bg-primary/5 hover:text-primary group/btn"
                          asChild
                        >
                          <Link href={card.link} target="_blank" rel="noopener noreferrer">
                            <span className="font-medium">View Details</span>
                            <ExternalLink className="h-3 w-3 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer indicator */}
      {cards.length > 1 && (
        <div className="px-5 py-2.5 border-t border-border/40 bg-muted/20">
          <p className="text-[10px] text-muted-foreground/70 text-center tracking-wide">
            {cards.length} highlight{cards.length !== 1 ? "s" : ""} available — click to expand
          </p>
        </div>
      )}
    </div>
  )
}
