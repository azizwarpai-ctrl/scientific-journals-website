import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config";
import { isScholarCitationMetaEnabled } from "@/src/lib/env";
import type { ArticleDetail } from "./article-detail-service";

export interface CitationMetaInput {
  article: ArticleDetail;
  canonicalUrl: string;
  pdfUrl?: string | null;
}

/**
 * Returns the real OJS download URL for the article's primary galley, of the
 * form `${ojsBaseUrl}/${journalUrlPath}/article/download/${submissionId}/${galleyId}`,
 * built from the actual OJS identifiers (NOT the digitopub publicationId).
 * Returns null if any required identifier is missing.
 */
function buildOjsDownloadUrl(article: ArticleDetail): string | null {
  const galley = article.primaryGalley;
  if (!galley) {
    return null;
  }

  const submissionId = galley.submissionId ?? article.submissionId;
  const galleyId = galley.galleyId;
  const journalUrlPath = galley.journalUrlPath ?? article.journalUrlPath;

  if (submissionId == null || galleyId == null || !journalUrlPath) {
    return null;
  }

  const base = getOjsBaseUrl();
  if (!base) {
    return null;
  }

  return `${base}/${journalUrlPath}/article/download/${submissionId}/${galleyId}`;
}

/**
 * Builds Highwire Press citation_* meta tags for Google Scholar discovery.
 * Returns a flat record suitable for Next.js Metadata `other` field.
 *
 * NOTE: this should only be attached to the page metadata when
 * EMIT_SCHOLAR_CITATION_META is true (Option B). See generateMetadata.
 */
export function buildCitationMeta(
  input: CitationMetaInput,
): Record<string, string | string[]> {
  const { article, pdfUrl } = input;
  const meta: Record<string, string | string[]> = {};

  if (article.title) {
    meta["citation_title"] = article.title;
  }

  const authorNames = (article.authors ?? [])
    .map((a) => a.fullName)
    .filter((n): n is string => Boolean(n));
  if (authorNames.length > 0) {
    meta["citation_author"] = authorNames;
  }

  if (article.publishedDate) {
    meta["citation_publication_date"] = article.publishedDate;
  }

  if (article.journalTitle) {
    meta["citation_journal_title"] = article.journalTitle;
  }

  if (article.volume) {
    meta["citation_volume"] = article.volume;
  }

  if (article.issue) {
    meta["citation_issue"] = article.issue;
  }

  if (article.doi) {
    meta["citation_doi"] = article.doi;
  }

  // citation_pdf_url resolution.
  //
  // The on-page "View PDF" URL routes through `/api/pdf-proxy` (see
  // buildGalleyDownloadUrl). A proxy/`/api/` URL must NEVER be emitted as
  // citation_pdf_url — Scholar would index a non-canonical, blocked path.
  //
  // citation_pdf_url is only meaningful at all when Scholar metadata is
  // enabled (Option B). When enabled, point it at the REAL OJS download URL
  // built from the actual OJS submissionId/galleyId/journalUrlPath.
  const pointsAtApi = (url: string): boolean => {
    // Match both relative ("/api/...") and absolute (".../api/...") forms.
    return /(^|\/)api\//.test(url) || url.includes("/api/pdf-proxy");
  };

  if (isScholarCitationMetaEnabled()) {
    const ojsDownloadUrl = buildOjsDownloadUrl(article);
    if (ojsDownloadUrl && !pointsAtApi(ojsDownloadUrl)) {
      meta["citation_pdf_url"] = ojsDownloadUrl;
    } else if (pdfUrl && !pointsAtApi(pdfUrl)) {
      // Fall back to a caller-provided URL only if it is not an /api/ path.
      meta["citation_pdf_url"] = pdfUrl;
    }
  }
  // When the flag is false we omit citation_pdf_url entirely. (The whole
  // `other` block is also gated off at the call site, so nothing is emitted.)

  return meta;
}

export default buildCitationMeta;
