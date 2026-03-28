import React from "react"

/**
 * Highlights occurrences of `query` within `text` by wrapping them in <mark>.
 * Returns plain text if no query is provided.
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.trim().length < 2) return text

  // Escape regex special characters in the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escaped})`, "gi")
  const parts = text.split(regex)

  if (parts.length === 1) return text

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-primary/20 text-foreground rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  )
}
