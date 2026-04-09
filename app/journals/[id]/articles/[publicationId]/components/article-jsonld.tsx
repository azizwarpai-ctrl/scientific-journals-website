import type { ArticleDetail } from "@/src/features/journals/types/article-detail-types"

/**
 * Server Component. Injects JSON-LD structured data for ScholarlyArticle.
 * Consumed by Google Scholar, Semantic Scholar, CrossRef, and other academic
 * indexing services to discover and catalog articles.
 *
 * @see https://schema.org/ScholarlyArticle
 */
export function ArticleJsonLd({ article }: { article: ArticleDetail }) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: article.title || "Untitled",
    name: article.title || "Untitled",
    ...(article.abstract && {
      description: article.abstract.replace(/<[^>]*>/g, "").substring(0, 500),
    }),
    ...(article.datePublished && {
      datePublished: article.datePublished,
    }),
    ...(article.doi && {
      identifier: {
        "@type": "PropertyValue",
        propertyID: "doi",
        value: article.doi,
      },
      sameAs: `https://doi.org/${article.doi}`,
    }),
    ...(article.keywords.length > 0 && {
      keywords: article.keywords.join(", "),
    }),
    ...(article.pages && { pagination: article.pages }),
    author: article.authors.map((a) => ({
      "@type": "Person",
      givenName: a.givenName,
      familyName: a.familyName,
      ...(a.affiliation && {
        affiliation: { "@type": "Organization", name: a.affiliation },
      }),
      ...(a.orcid && { sameAs: a.orcid }),
    })),
    isPartOf: {
      "@type": "PublicationIssue",
      issueNumber: article.issueNumber || undefined,
      isPartOf: {
        "@type": ["PublicationVolume", "Periodical"],
        name: article.journalTitle || undefined,
        volumeNumber: article.volume || undefined,
        ...(article.issn && { issn: article.issn }),
        ...(article.eIssn && { issn: article.eIssn }),
      },
    },
    ...(article.pdfUrl && {
      url: article.pdfUrl,
    }),
    publisher: {
      "@type": "Organization",
      name: "Digitopub",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
