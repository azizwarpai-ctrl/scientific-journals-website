/**
 * Apex Scholar-metadata kill switch.
 *
 * The journal's Google-Scholar record lives at the OJS host
 * (`journals.digitopub.com`). The apex (`digitopub.com`) defers to it via
 * `<link rel="canonical">` and MUST NOT emit competing `citation_*` /
 * ScholarlyArticle metadata, or both surfaces compete for the same record.
 *
 * Default off. Flipped to `"true"` only by deliberate ops action.
 */
export function shouldEmitScholarCitationMeta(): boolean {
  return process.env.EMIT_SCHOLAR_CITATION_META === "true"
}
