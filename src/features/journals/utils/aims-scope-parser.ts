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

const AIMS_PATTERNS = [
  /^aims?$/i,
  /^aims?\s+of/i,
  /^journal\s+aims?/i,
  /^editorial\s+aims?/i,
  /^aims?\s*&\s*objectives?/i,
  /^objectives?$/i,
  /^mission$/i,
]
const SCOPE_PATTERNS = [
  /^scope$/i,
  /^scope\s+of/i,
  /^journal\s+scope/i,
  /^topics?\s+covered/i,
  /^subject\s+scope/i,
  /^areas?\s+of\s+interest/i,
  /^coverage$/i,
]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  const trimmed = text
    .trim()
    .replace(/[:：.]+$/g, "")
    .trim()
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

  // Strategy 3: plain-text markers on their own line — "Aims\n…\nScope\n…".
  // OJS's rich-text editor sometimes flattens pasted content into paragraphs
  // without explicit heading tags; try to detect those boundaries too.
  const stripped = combined.replace(/<br\s*\/?>/gi, "\n")
  const plainLines = stripped
    .split(/<\/?p[^>]*>|\n+/i)
    .map((s) => s.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean)

  let aimsLineIdx = -1
  let scopeLineIdx = -1
  for (let i = 0; i < plainLines.length; i++) {
    const line = plainLines[i]
    if (aimsLineIdx === -1 && matchesAny(line, AIMS_PATTERNS)) aimsLineIdx = i
    if (scopeLineIdx === -1 && matchesAny(line, SCOPE_PATTERNS)) scopeLineIdx = i
  }

  if (aimsLineIdx !== -1 && scopeLineIdx !== -1 && aimsLineIdx !== scopeLineIdx) {
    const first = Math.min(aimsLineIdx, scopeLineIdx)
    const second = Math.max(aimsLineIdx, scopeLineIdx)
    const firstBody = plainLines.slice(first + 1, second).join(" ").trim()
    const secondBody = plainLines.slice(second + 1).join(" ").trim()
    const aimsBody = aimsLineIdx < scopeLineIdx ? firstBody : secondBody
    const scopeBody = aimsLineIdx < scopeLineIdx ? secondBody : firstBody
    if (aimsBody && scopeBody) {
      return {
        aims: `<p>${aimsBody}</p>`,
        scope: `<p>${scopeBody}</p>`,
        combined: null,
      }
    }
  }

  return { aims: null, scope: null, combined }
}
