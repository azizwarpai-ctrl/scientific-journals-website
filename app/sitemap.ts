import type { MetadataRoute } from "next"

import { prisma } from "@/src/lib/db/config"
import {
  fetchArchiveIssues,
  fetchIssueWithArticles,
} from "@/src/features/journals/server/archive-issue-service"
import { fetchCurrentIssue } from "@/src/features/journals/server/current-issue-service"
import { isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { buildCanonical } from "@/src/lib/seo/canonical"

// Sitemap must be generated at request time, not build time, since it
// queries the database. This prevents build failures when DATABASE_URL
// is unset in CI/build environments.
export const dynamic = "force-dynamic"

// Regenerate hourly. OJS lookups are not free, and the article corpus does
// not change minute-to-minute.
export const revalidate = 3600

interface IssueRef {
  issueId: number
  datePublished: string | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = []

  entries.push({
    url: buildCanonical("/"),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1.0,
  })

  const journals = await prisma.journal.findMany({
    select: { id: true, ojs_id: true, updated_at: true },
  })

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

    try {
      const current = await fetchCurrentIssue(journal.ojs_id)
      if (current) {
        issueRefs.push({ issueId: current.issueId, datePublished: current.datePublished })
      }
    } catch (err) {
      console.error(
        `[sitemap] fetchCurrentIssue failed for journal ojs_id=${journal.ojs_id}:`,
        err
      )
    }

    try {
      const archive = await fetchArchiveIssues(journal.ojs_id)
      for (const issue of archive) {
        if (issueRefs.some((r) => r.issueId === issue.issueId)) continue
        issueRefs.push({ issueId: issue.issueId, datePublished: issue.datePublished })
      }
    } catch (err) {
      console.error(
        `[sitemap] fetchArchiveIssues failed for journal ojs_id=${journal.ojs_id}:`,
        err
      )
    }

    for (const { issueId } of issueRefs) {
      let issue
      try {
        issue = await fetchIssueWithArticles(journal.ojs_id, issueId)
      } catch (err) {
        console.error(
          `[sitemap] fetchIssueWithArticles failed for journal ojs_id=${journal.ojs_id}, issue_id=${issueId}:`,
          err
        )
        continue
      }
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
