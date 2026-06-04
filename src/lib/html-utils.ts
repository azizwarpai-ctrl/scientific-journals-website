/**
 * Decode common HTML entities in a string.
 *
 * Numeric entities (&#38; / &#x26;) are processed before named ones to avoid
 * double-decoding sequences like &#38; → &amp; → &.
 */
export function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
}
