import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/src/lib/db/config"
import { searchQuerySchema } from "../schemas/search-schema"
import type { SearchResult } from "../schemas/search-schema"

const STATIC_PAGES = [
  { title: "About Us", description: "Learn about DigitoPub and our mission to elevate scientific publishing.", url: "/about", field: "Company" },
  { title: "Help Hub", description: "Find answers and support for your publishing needs and common questions.", url: "/help", field: "Support" },
  { title: "Solutions", description: "Explore our software solutions designed for modern publishers.", url: "/solutions", field: "Services" },
  { title: "Submit Manager", description: "Manage and track your scientific manuscript submissions securely.", url: "/submit-manager", field: "Platform" },
  { title: "Journals Directory", description: "Browse all our published scientific and academic journals.", url: "/journals", field: "Directory" },
  { title: "Contact Us", description: "Get in touch with our support and editorial team.", url: "/contact", field: "Support" },
  { title: "Register / Sign Up", description: "Create a new account on the DigitoPub platform.", url: "/register", field: "Account" }
]

// ─── 3. In-Memory Caching for Static Pages ──────────────────────────────────────
let staticPagesCache: SearchResult[] | null = null

function getStaticPages(): SearchResult[] {
  if (staticPagesCache) return staticPagesCache
  
  staticPagesCache = STATIC_PAGES.map(p => ({
    id: p.url,
    type: "page" as const,
    title: p.title,
    description: p.description,
    url: p.url,
    field: p.field
  }))
  return staticPagesCache
}

// ─── 1. Timeout Handling Utility ────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
    promise
      .then((val) => {
        clearTimeout(timer)
        resolve(val)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

// ─── 2. Result Ranking System ───────────────────────────────────────────────────
function scoreResult(result: SearchResult, words: string[]): number {
  let score = 0
  const title = result.title.toLowerCase()
  const desc = (result.description || "").toLowerCase()
  const field = (result.field || "").toLowerCase()

  for (const w of words) {
    const lowerW = w.toLowerCase()
    
    // Title match -> highest weight
    if (title === lowerW) score += 50
    else if (title.startsWith(lowerW)) score += 30
    else if (title.includes(lowerW)) score += 20
    
    // Description match -> medium weight
    if (desc.includes(lowerW)) score += 10
    
    // Field/Category match -> lower weight
    if (field.includes(lowerW)) score += 5
  }
  return score
}

const app = new Hono()

// GET /search?q=...&type=all|journal|solution|faq&limit=20
app.get("/", zValidator("query", searchQuerySchema), async (c) => {
  try {
    const { q, type, limit: limitStr } = c.req.valid("query")
    const limit = Math.min(parseInt(limitStr, 10) || 20, 50)

    const words = q.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      return c.json({ success: true, data: { results: [], total: 0, query: q } })
    }

    const promises: Promise<SearchResult[]>[] = []
    
    // ─── 4. Partial Failure Detection ─────────────────────────────────────────────
    let hasError = false
    const safePromise = <T extends SearchResult>(promise: Promise<T[]>) => 
      withTimeout(promise, 3000).catch((error) => {
        hasError = true
        console.error("[SEARCH_QUERY_ERROR]", error.message || error)
        return [] as T[]
      })

    // Search Journals
    if (type === "all" || type === "journal") {
      promises.push(
        safePromise(
          prisma.journal
            .findMany({
              where: {
                status: "active",
                AND: words.map((w) => ({
                  OR: [
                    { title: { contains: w, mode: "insensitive" } },
                    { description: { contains: w, mode: "insensitive" } },
                    { field: { contains: w, mode: "insensitive" } },
                    { publisher: { contains: w, mode: "insensitive" } },
                  ],
                })),
              },
              select: { id: true, title: true, description: true, field: true },
              take: type === "all" ? Math.ceil(limit / 3) : limit,
            })
            .then((journals) =>
              journals.map((j) => ({
                id: j.id.toString(),
                type: "journal" as const,
                title: j.title,
                description: j.description?.slice(0, 150) || "",
                url: `/journals/${j.id}`,
                field: j.field,
              }))
            )
        )
      )
    }

    // Search Solutions
    if (type === "all" || type === "solution") {
      promises.push(
        safePromise(
          prisma.solution
            .findMany({
              where: {
                is_published: true,
                AND: words.map((w) => ({
                  OR: [{ title: { contains: w, mode: "insensitive" } }, { description: { contains: w, mode: "insensitive" } }],
                })),
              },
              select: { id: true, title: true, description: true, icon: true },
              take: type === "all" ? Math.ceil(limit / 3) : limit,
            })
            .then((solutions) =>
              solutions.map((s) => ({
                id: s.id.toString(),
                type: "solution" as const,
                title: s.title,
                description: s.description?.slice(0, 150) || "",
                url: "/solutions",
                icon: s.icon,
              }))
            )
        )
      )
    }

    // Search FAQs
    if (type === "all" || type === "faq") {
      promises.push(
        safePromise(
          prisma.fAQ
            .findMany({
              where: {
                is_published: true,
                AND: words.map((w) => ({
                  OR: [{ question: { contains: w, mode: "insensitive" } }, { answer: { contains: w, mode: "insensitive" } }],
                })),
              },
              select: { id: true, question: true, answer: true, category: true },
              take: type === "all" ? Math.ceil(limit / 3) : limit,
            })
            .then((faqs) =>
              faqs.map((f) => ({
                id: f.id.toString(),
                type: "faq" as const,
                title: f.question,
                description: f.answer?.slice(0, 150) || "",
                url: "/help",
                field: f.category,
              }))
            )
        )
      )
    }

    // Search Static Pages
    if (type === "all" || type === "page") {
      promises.push(
        safePromise(
          Promise.resolve(
            getStaticPages().filter(p =>
              words.every(w => {
                const lowerW = w.toLowerCase()
                return p.title.toLowerCase().includes(lowerW) ||
                       p.description.toLowerCase().includes(lowerW) ||
                       (p.field && p.field.toLowerCase().includes(lowerW))
              })
            ).slice(0, type === "all" ? Math.ceil(limit / 3) : limit)
          )
        )
      )
    }

    const resultsArray = await Promise.all(promises)
    let results = resultsArray.flat()

    // ─── Rank and Sort Results ────────────────────────────────────────────────────
    results = results.sort((a, b) => scoreResult(b, words) - scoreResult(a, words))

    // Ensure we don't accidentally exceed the absolute search limit after flattening
    results = results.slice(0, limit)

    // ─── Return Response ──────────────────────────────────────────────────────────
    const responseData: any = {
      results,
      total: results.length,
      query: q,
    }

    // ─── 5. Partial Failure Detection Warning ─────────────────────────────────────
    if (hasError) {
      responseData.warning = "Some results may be incomplete" // Graceful degradation warning
    }

    return c.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error("[SEARCH_ERROR]", error)
    return c.json({ success: false, error: "Search failed" }, 500)
  }
})

export { app as searchRouter }
