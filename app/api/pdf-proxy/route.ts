import { NextResponse } from "next/server"
import {
  streamOjsPdf,
  jsonError,
  type ProxyErrorCode,
} from "@/src/features/ojs/server/ojs-pdf-stream"

/**
 * PDF proxy for gated / hotlink-protected OJS galleys (backward compatibility).
 *
 * Directs requests to the shared OJS PDF streaming core (`streamOjsPdf`).
 * Public clean URLs use `/journals/[id]/articles/[publicationId]/pdf`.
 */

const ID_PATTERN = /^\d+$/
const JOURNAL_PATTERN = /^[A-Za-z0-9._-]+$/

interface ValidatedParams {
  journal: string
  submissionId: string
  galleyId: string
  fileId: string
}

function validateParams(request: Request): ValidatedParams | NextResponse {
  const { searchParams } = new URL(request.url)
  const journal = searchParams.get("journal")
  const submissionId = searchParams.get("submissionId")
  const galleyId = searchParams.get("galleyId")
  const fileId = searchParams.get("fileId")

  if (!journal || !submissionId || !galleyId || !fileId) {
    return jsonError(
      "BAD_REQUEST",
      "Missing required parameters (journal, submissionId, galleyId, fileId).",
      400
    )
  }

  if (
    !ID_PATTERN.test(submissionId) ||
    !ID_PATTERN.test(galleyId) ||
    !ID_PATTERN.test(fileId) ||
    !JOURNAL_PATTERN.test(journal)
  ) {
    return jsonError("BAD_REQUEST", "Invalid parameter format.", 400)
  }

  return { journal, submissionId, galleyId, fileId }
}

export async function GET(request: Request) {
  const validated = validateParams(request)
  if (validated instanceof NextResponse) return validated
  const { journal, submissionId, galleyId, fileId } = validated

  return streamOjsPdf({
    journal,
    submissionId,
    galleyId,
    fileId,
    filename: `article-${submissionId}.pdf`,
    contentDisposition: "inline",
  })
}

/**
 * HEAD response is strictly metadata: it validates the request shape and
 * returns 200 with PDF-ish headers, or mirrors the validation error's
 * status + X-Proxy-Error header with no body (RFC 9110 §9.3.2).
 */
export async function HEAD(request: Request) {
  const validated = validateParams(request)
  if (validated instanceof NextResponse) {
    return new NextResponse(null, {
      status: validated.status,
      headers: validated.headers,
    })
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Accept-Ranges": "none",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}
