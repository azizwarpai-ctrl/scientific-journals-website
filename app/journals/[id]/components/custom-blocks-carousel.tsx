"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetCustomBlocks } from "@/src/features/journals/api/use-get-custom-blocks"
import DOMPurify from "dompurify"

interface CustomBlocksCarouselProps {
  /** The journal's slug / ojs_path / ojs_id */
  journalId: string
}

export function CustomBlocksCarousel({ journalId }: CustomBlocksCarouselProps) {
  const [current, setCurrent] = useState(0)
  const { data, isLoading } = useGetCustomBlocks(journalId)

  useEffect(() => {
    setCurrent(prev => {
      if (!data?.blocks) return 0;
      return Math.min(prev, Math.max(0, data.blocks.length - 1));
    });
  }, [journalId, data?.blocks]);

  // Loading state — single placeholder
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded bg-muted w-full" />
          <div className="h-3 rounded bg-muted w-5/6" />
          <div className="h-3 rounded bg-muted w-4/6" />
        </div>
      </div>
    )
  }

  // No blocks — render nothing
  if (!data || data.blocks.length === 0) return null

  const blocks = data.blocks
  const total = blocks.length
  const validCurrent = Math.min(current, Math.max(0, total - 1))
  const block = blocks[validCurrent]
  
  if (!block) return null

  // Sanitize at render time (belt-and-suspenders — service already sanitized)
  const safeContent =
    typeof window !== "undefined"
      ? DOMPurify.sanitize(block.content, {
          ALLOWED_TAGS: [
            "p", "br", "strong", "em", "b", "i", "u",
            "ul", "ol", "li",
            "h2", "h3", "h4", "h5",
            "a", "span", "div",
            "table", "thead", "tbody", "tr", "th", "td",
            "img", "blockquote", "hr",
          ],
          ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "width", "height", "class", "colspan", "rowspan"],
        })
      : block.content

  const prev = () => setCurrent((c) => (c - 1 + total) % total)
  const next = () => setCurrent((c) => (c + 1) % total)

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">Journal Information</h3>
        </div>
        {/* Pagination controls — only show for multiple blocks */}
        {total > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={prev}
              aria-label="Previous block"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {current + 1}/{total}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={next}
              aria-label="Next block"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Block content */}
      <div className="p-5">
        <div
          className="prose prose-sm prose-slate dark:prose-invert max-w-none
                     [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline
                     [&_p]:leading-relaxed [&_p]:text-sm [&_p]:text-muted-foreground
                     [&_ul]:text-sm [&_ol]:text-sm
                     [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-xs
                     [&_img]:rounded-md [&_img]:w-full"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      </div>

      {/* Dot indicators for multiple blocks */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 px-5 pb-4">
          {blocks.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to block ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
