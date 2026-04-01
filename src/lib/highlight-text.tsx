import React from "react"

/**
 * Highlights occurrences of `query` within `text` by wrapping them in <mark>.
 * Returns plain text if no query is provided.
 *
 * Bug fix: the previous version called regex.test(part) inside .map() on a
 * /gi regex. Because /g makes regex stateful (lastIndex advances), every
 * other match was silently skipped.  We now compare part.toLowerCase() to
 * the query string directly — no regex state involved.
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.trim().length < 2) return text

  // Escape regex special characters in the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  // Split on matches (gi captures them as separate parts)
  const regex = new RegExp(`(${escaped})`, "gi")
  const parts = text.split(regex)

  if (parts.length === 1) return text

  const lowerQuery = query.toLowerCase()

  return (
    <>
      {parts.map((part, i) =>
        // Compare lowercase — avoids the stateful regex.test() bug
        part.toLowerCase() === lowerQuery ? (
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
