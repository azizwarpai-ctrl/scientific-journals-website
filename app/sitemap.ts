import type { MetadataRoute } from "next"

import { prisma } from "@/src/lib/db/config"
import {
  fetchArchiveIssues,
  fetchIssueWithArticles,
} from "@/src/features/journals/server/archive-issue-service"
import { fetchCurrentIssue } from "@/src/features/journals/server/current-issue-service"
import { isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { buildCanonical } from "@/src/lib/seo/canonical"

// Generated at request time. ISR ensures we recompute hourly and serve the
// cached XML in between, so a cold OJS / DB does not stall every crawler hit.
export const dynamic = "force-dynamic"
export const revalidate = 3600

// Maximum time we wait for any single OJS / DB lookup. Past this, the call is
// abandoned and the sitemap is emitted with fewer URLs rather than no
// response at all. Each OJS lookup also has its own retry budget, so this is
// the upper bound from sitemap.ts's perspective.
const PER_QUERY_TIMEOUT_MS = 4000

// Public, non-dynamic routes that must appear in the sitemap regardless of
// whether the database or OJS is reachable. Source of truth: config/routes.ts
// PUBLIC_ROUTES, filtered to indexable pages (auth/account/admin routes are
// intentionally omitted — they're disallow'd in robots.txt).
const STATIC_PUBLIC_PATHS = [
  "/about",
  "/contact",
  "/help",
  "/help/submission-service",
  "/help/technical-support",
  "/journals",
  "/solutions",
  "/submit-manager",
  "/register",
] as const

interface IssueRef {
  issueId: number
  datePublished: string | null
}

// Run `p` but bail out after `ms`. Returns `null` on timeout or rejection so
// the caller can degrade gracefully without try/catch noise at every call site.
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race<T | null>([
      p.catch((err) => {
        console.error(`[sitemap] ${label} rejected:`, err)
        return null
      }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.error(`[sitemap] ${label} timed out after ${ms}ms`)
          resolve(null)
        }, ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  // ── Homepage + static routes ────────────────────────────────────
  // Always emitted, no I/O dependency. Guarantees the sitemap is never empty
  // even if Prisma and OJS are both unreachable.
  entries.push({
    url: buildCanonical("/"),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1.0,
  })

  for (const path of STATIC_PUBLIC_PATHS) {
    entries.push({
      url: buildCanonical(path),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    })
  }

  // ── Journals (Prisma) ───────────────────────────────────────────
  let journals: Array<{ id: bigint; ojs_id: string | null; updated_at: Date | null }> = []
  try {
    journals = await prisma.journal.findMany({
      select: { id: true, ojs_id: true, updated_at: true },
    })
  } catch (err) {
    console.error("[sitemap] prisma.journal.findMany failed; emitting static routes only:", err)
    return entries
  }

  const ojsAvailable = isOjsConfigured()

  for (const journal of journals) {
    const journalIdForUrl = journal.ojs_id ?? String(journal.id)
    const journalLastModified = journal.updated_at ?? now

    entries.push({
      url: buildCanonical(`/journals/${journalIdForUrl}`),
      lastModified: journalLastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    })

    if (!ojsAvailable || !journal.ojs_id) continue

    const issueRefs: IssueRef[] = []

    const current = await withTimeout(
      fetchCurrentIssue(journal.ojs_id),
      PER_QUERY_TIMEOUT_MS,
      `fetchCurrentIssue(ojs_id=${journal.ojs_id})`
    )
    if (current) {
      issueRefs.push({ issueId: current.issueId, datePublished: current.datePublished })
    }

    const archive = await withTimeout(
      fetchArchiveIssues(journal.ojs_id),
      PER_QUERY_TIMEOUT_MS,
      `fetchArchiveIssues(ojs_id=${journal.ojs_id})`
    )
    if (archive) {
      for (const issue of archive) {
        if (issueRefs.some((r) => r.issueId === issue.issueId)) continue
        issueRefs.push({ issueId: issue.issueId, datePublished: issue.datePublished })
      }
    }

    for (const { issueId } of issueRefs) {
      const issue = await withTimeout(
        fetchIssueWithArticles(journal.ojs_id, issueId),
        PER_QUERY_TIMEOUT_MS,
        `fetchIssueWithArticles(ojs_id=${journal.ojs_id}, issue_id=${issueId})`
      )
      if (!issue) continue

      const issueLastModified = issue.datePublished
        ? new Date(issue.datePublished)
        : journalLastModified

      if (issue.volume != null && issue.number) {
        entries.push({
          url: buildCanonical(
            `/journals/${journalIdForUrl}/issues/${issue.volume}/${issue.number}`
          ),
          lastModified: issueLastModified,
          changeFrequency: "monthly",
          priority: 0.7,
        })
      }

      for (const article of issue.articles) {
        const articleLastModified = article.datePublished
          ? new Date(article.datePublished)
          : issueLastModified
        entries.push({
          url: buildCanonical(
            `/journals/${journalIdForUrl}/articles/${article.publicationId}`
          ),
          lastModified: articleLastModified,
          changeFrequency: "monthly",
          priority: 0.8,
        })
      }
    }
  }

  return entries
}
