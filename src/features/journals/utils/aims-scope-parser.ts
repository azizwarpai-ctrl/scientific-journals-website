/**
 * OJS stores aims and scope as a single HTML block under the `aimsAndScope`
 * setting. Journals commonly structure this block with two headings — e.g.
 * `<h3>Aims</h3> … <h3>Scope</h3> …` or bold/paragraph variants. When that
 * structure is present, render each part as its own card; when it's a single
 * unified narrative, render it as one combined card.
 */

export interface AimsScopeParts {
  aims: string | null
  scope: string | null
  /** Fallback content when the block cannot be split cleanly */
  combined: string | null
}

const AIMS_PATTERNS = [/^aims?$/i, /^aims?\s+of/i, /^journal\s+aims?/i, /^editorial\s+aims?/i]
const SCOPE_PATTERNS = [/^scope$/i, /^scope\s+of/i, /^journal\s+scope/i, /^topics?\s+covered/i, /^subject\s+scope/i]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  const trimmed = text.trim().replace(/[:：]$/, "").trim()
  return patterns.some((p) => p.test(trimmed))
}

/**
 * Attempt to split a combined aims-and-scope HTML blob into distinct Aims and
 * Scope sections. Returns `combined` unchanged when no clear split is found.
 */
export function parseAimsAndScope(html: string | null | undefined): AimsScopeParts {
  if (!html || !html.trim()) {
    return { aims: null, scope: null, combined: null }
  }

  const combined = html.trim()

  // Strategy 1: heading-based split (h1–h6, strong, or <b>)
  const headingRegex = /<(h[1-6]|strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi
  const headings: Array<{ index: number; length: number; label: string }> = []
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(combined)) !== null) {
    const inner = match[2].replace(/<[^>]*>/g, "")
    headings.push({ index: match.index, length: match[0].length, label: inner })
  }

  const aimsHeading = headings.find((h) => matchesAny(h.label, AIMS_PATTERNS))
  const scopeHeading = headings.find((h) => matchesAny(h.label, SCOPE_PATTERNS))

  if (aimsHeading && scopeHeading && aimsHeading.index !== scopeHeading.index) {
    const first = aimsHeading.index < scopeHeading.index ? aimsHeading : scopeHeading
    const second = aimsHeading.index < scopeHeading.index ? scopeHeading : aimsHeading

    const firstBody = combined
      .slice(first.index + first.length, second.index)
      .trim()
    const secondBody = combined.slice(second.index + second.length).trim()

    const aimsBody = aimsHeading.index < scopeHeading.index ? firstBody : secondBody
    const scopeBody = aimsHeading.index < scopeHeading.index ? secondBody : firstBody

    if (aimsBody && scopeBody) {
      return { aims: aimsBody, scope: scopeBody, combined: null }
    }
  }

  // Strategy 2: keyword-labeled paragraphs — "<p><strong>Aims:</strong> …"
  // handled by the heading path above via the <strong> match.

  return { aims: null, scope: null, combined }
}
