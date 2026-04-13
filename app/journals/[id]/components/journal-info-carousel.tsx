"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import useEmblaCarousel from "embla-carousel-react"

interface JournalInfoCarouselProps {
  journalId: string
}

export function JournalInfoCarousel({ journalId }: JournalInfoCarouselProps) {
  const { data, isLoading } = useGetCustomBlocks(journalId)
  
  const items = data?.blocks || []
  
  // Phase 4: Data Validation Check
  console.log("Highlights count:", items.length)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start"
  })

  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => { 
    if (!emblaApi) return; 

    const interval = setInterval(() => { 
      emblaApi.scrollNext(); 
    }, 4000); 

    const onSelect = () => { 
      setSelectedIndex(emblaApi.selectedScrollSnap()); 
    }; 

    emblaApi.on("select", onSelect); 
    onSelect();
    
    return () => clearInterval(interval);
  }, [emblaApi]);

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

  if (items.length === 0) return null

  // Card Content Component
  const HighlightCard = ({ data }: { data: any }) => (
    <div className="p-5 flex flex-col h-[380px]">
      {/* Card Image */}
      {data.image && (
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border/40 bg-muted/20 mb-4 shadow-inner flex-shrink-0">
          <Image
            src={data.image}
            alt={data.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      )}

      {/* Text Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <h4 className="text-base font-bold text-foreground leading-snug mb-2 tracking-tight line-clamp-2">
          {data.title}
        </h4>

        <p className="text-[13px] text-muted-foreground/90 leading-relaxed overflow-hidden text-ellipsis whitespace-pre-line font-medium italic flex-1" style={{ display: '-webkit-box', WebkitLineClamp: data.image ? 3 : 8, WebkitBoxOrient: 'vertical' }}>
          &ldquo;{data.description}&rdquo;
        </p>
      </div>

      {/* Action */}
      {data.link && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 justify-between text-[11px] h-9 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white transition-all group/btn font-bold uppercase tracking-wider flex-shrink-0"
          asChild
        >
          <Link href={data.link} target="_blank" rel="noopener noreferrer">
            <span>Explore More</span>
            <ExternalLink className="h-3 w-3 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
          </Link>
        </Button>
      )}
    </div>
  )

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm flex flex-col h-full">
      {/* Section Header */}
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent flex-shrink-0">
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
      </div>

      {/* Render Dynamic View */}
      {items.length <= 1 ? (
        <HighlightCard data={items[0]} />
      ) : (
        <div className="flex-1 flex flex-col">
          <div ref={emblaRef} className="overflow-hidden w-full"> 
            <div className="flex"> 
              {items.map((item, index) => ( 
                <div key={index} className="flex-[0_0_100%] min-w-0 border-r border-border/20 last:border-r-0"> 
                  <HighlightCard data={item} /> 
                </div> 
              ))} 
            </div>
          </div>

          <div className="flex justify-center items-center gap-2 px-5 py-4 bg-muted/10 border-t border-border/20 flex-shrink-0"> 
            {items.map((_, index) => ( 
              <button 
                key={index} 
                onClick={() => emblaApi?.scrollTo(index)} 
                aria-label={`Go to slide ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${ 
                  index === selectedIndex ? "w-8 bg-primary shadow-sm" : "w-1.5 bg-muted-foreground/30 hover:bg-primary/50" 
                }`} 
              /> 
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
