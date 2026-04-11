import type { JournalInfoCard } from "../types/custom-block-types"

/**
 * Utility to parse raw OJS Custom Block HTML into structured data.
 * 
 * Target extraction rules:
 * - <h3> or <h2> or <h4> -> title
 * - <p> -> description (concatenated if multiple)
 * - <a> -> link (first one found)
 * - <img> -> image (first one found)
 */
export function parseCustomBlockHtml(html: string, blockName: string): JournalInfoCard {
  // Use a temporary DOM element for parsing in the browser
  if (typeof document === "undefined") {
    // Fallback for SSR (basic regex extraction to prevent crash)
    return {
      title: blockName,
      description: "Content Loading...",
    }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // 1. Extract Title: prioritize <h3>, then <h2>, then <h4>
  const titleEl = doc.querySelector("h3") || doc.querySelector("h2") || doc.querySelector("h4")
  const title = titleEl?.textContent?.trim() || blockName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // 2. Extract Description: concatenate all <p> tags
  const pTags = Array.from(doc.querySelectorAll("p"))
  const description = pTags
    .map(p => p.textContent?.trim())
    .filter(Boolean)
    .join("\n\n") || "No description available."

  // 3. Extract Link: first <a> with href
  const linkEl = doc.querySelector("a[href]")
  const link = linkEl?.getAttribute("href") || undefined

  // 4. Extract Image: first <img> with src
  const imgEl = doc.querySelector("img[src]")
  const image = imgEl?.getAttribute("src") || undefined

  return {
    title,
    description,
    link,
    image,
  }
}
