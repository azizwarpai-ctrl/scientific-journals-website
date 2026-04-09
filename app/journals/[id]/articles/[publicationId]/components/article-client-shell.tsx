"use client"

import type { ArticleDetail } from "@/src/features/journals/types/article-detail-types"
import { ArticleSidebar } from "./article-sidebar"
import { PdfViewer } from "./pdf-viewer"

/**
 * Client boundary for interactive article components.
 *
 * This shell receives pre-fetched article data from the Server Component page
 * and renders only the parts that require client-side interactivity:
 * - Citation box (copy to clipboard, format switching)
 * - PDF viewer (iframe toggling)
 * - Metrics display (future: increment on mount)
 * - Sidebar sticky behaviour
 *
 * All article content (title, abstract, authors, metadata) is rendered as
 * Server Components for SEO and remains in the initial HTML payload.
 */
interface ArticleClientShellProps {
  article: ArticleDetail
}

export function ArticleClientShell({ article }: ArticleClientShellProps) {
  return (
    <>
      {/* Sidebar — sticky, interactive */}
      <div className="lg:col-span-4">
        <div className="sticky top-24">
          <ArticleSidebar article={article} />
        </div>
      </div>

      {/* Inline PDF viewer — rendered after main content via portal or direct placement */}
      {article.pdfUrl && (
        <div className="lg:col-span-8 lg:col-start-1" id="pdf-viewer-section">
          <PdfViewer pdfUrl={article.pdfUrl} />
        </div>
      )}
    </>
  )
}
