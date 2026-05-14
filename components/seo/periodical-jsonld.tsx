/**
 * Server-rendered Periodical schema for a journal landing page.
 *
 * Tells Google Scholar / general search this is a periodical with ISSN(s),
 * publisher, and a stable URL. Complements the article-level
 * ScholarlyArticle schema with the "isPartOf" parent record.
 *
 * @see https://schema.org/Periodical
 */
interface PeriodicalJsonLdProps {
  name: string
  description?: string | null
  url: string
  issn?: string | null
  eIssn?: string | null
  publisher?: string | null
  publisherUrl?: string
}

export function PeriodicalJsonLd({
  name,
  description,
  url,
  issn,
  eIssn,
  publisher,
  publisherUrl,
}: PeriodicalJsonLdProps) {
  const issnList = [issn, eIssn].filter((v): v is string => Boolean(v))

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Periodical",
    name,
    url,
  }

  if (description) {
    // Strip any HTML and cap length so the schema field stays readable.
    jsonLd.description = description.replace(/<[^>]+>/g, " ").trim().slice(0, 500)
  }

  if (issnList.length > 0) {
    jsonLd.issn = issnList.length === 1 ? issnList[0] : issnList
  }

  if (publisher) {
    jsonLd.publisher = {
      "@type": "Organization",
      name: publisher,
      ...(publisherUrl ? { url: publisherUrl } : {}),
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
