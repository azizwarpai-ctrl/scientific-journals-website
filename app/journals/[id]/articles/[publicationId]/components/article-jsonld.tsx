import type { ArticleDetail } from "@/src/features/journals/types/article-detail-types"
import { buildOjsPdfDownloadUrl } from "@/src/features/journals/server/citation-meta"

/**
 * Server Component. Injects JSON-LD structured data for ScholarlyArticle.
 * Consumed by Google Scholar, Semantic Scholar, CrossRef, and other academic
 * indexing services to discover and catalog articles.
 *
 * @see https://schema.org/ScholarlyArticle
 */
/**
 * Whether digitopub emits Google-Scholar discovery metadata. Defaults to false
 * (Option A — OJS owns the Scholar record), in which case this component renders
 * nothing. Evaluated server-side; never exposed as NEXT_PUBLIC_.
 */
const EMIT_SCHOLAR_CITATION_META =
  process.env.EMIT_SCHOLAR_CITATION_META === "true"

export function ArticleJsonLd({ article }: { article: ArticleDetail }) {
  // Defensive self-gate: even though the call site only renders this under the
  // flag, never emit ScholarlyArticle (a "this is a journal article" signal)
  // when Scholar discovery metadata is disabled.
  if (!EMIT_SCHOLAR_CITATION_META) {
    return null
  }

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
      ...(a.orcid && { 
        sameAs: a.orcid.startsWith("http") ? a.orcid : `https://orcid.org/${a.orcid}` 
      }),
    })),
    isPartOf: {
      "@type": "PublicationIssue",
      issueNumber: article.issueNumber || undefined,
      isPartOf: {
        "@type": ["PublicationVolume", "Periodical"],
        name: article.journalTitle || undefined,
        volumeNumber: article.volume || undefined,
        ...([article.issn, article.eIssn].filter(Boolean).length > 0 && { 
          issn: [article.issn, article.eIssn].filter(Boolean) 
        }),
      },
    },
    // Never emit a robots-blocked /api/pdf-proxy URL in JSON-LD.
    // Substitute the real OJS public download URL; omit if unavailable.
    ...((() => {
      const isProxy = article.pdfUrl && /(^|\/\/[^/]+)?\/api\//.test(article.pdfUrl)
      const safeUrl = isProxy ? buildOjsPdfDownloadUrl(article) : article.pdfUrl
      return safeUrl ? { url: safeUrl } : {}
    })()),
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
