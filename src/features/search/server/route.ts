import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { prisma } from "@/src/lib/db/config"
import { searchQuerySchema } from "../schemas/search-schema"
import type { SearchableItem } from "../schemas/search-schema"

const STATIC_PAGES = [
  { title: "About Us", description: "Learn about DigitoPub and our mission to elevate scientific publishing.", url: "/about", field: "Company" },
  { title: "Help Hub", description: "Find answers and support for your publishing needs and common questions.", url: "/help", field: "Support" },
  { title: "Solutions", description: "Explore our software solutions designed for modern publishers.", url: "/solutions", field: "Services" },
  { title: "Submit Manager", description: "Manage and track your scientific manuscript submissions securely.", url: "/submit-manager", field: "Platform" },
  { title: "Journals Directory", description: "Browse all our published scientific and academic journals.", url: "/journals", field: "Directory" },
  { title: "Contact Us", description: "Get in touch with our support and editorial team.", url: "/contact", field: "Support" },
  { title: "Register / Sign Up", description: "Create a new account on the DigitoPub platform.", url: "/register", field: "Account" }
]

// ─── Static Caches ──────────────────────────────────────────────────────────────
let staticPagesCache: SearchableItem[] | null = null

function getStaticPages(): SearchableItem[] {
  if (staticPagesCache) return staticPagesCache
  
  staticPagesCache = STATIC_PAGES.map(p => ({
    id: p.url,
    type: "page" as const,
    title: p.title,
    description: p.description,
    content: `${p.title} ${p.description} ${p.field}`, // Searchable depth
    url: p.url,
    field: p.field
  }))
  return staticPagesCache
}

// ─── Timeout Wrapper ────────────────────────────────────────────────────────────
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

// ─── Weighted Ranking Engine ────────────────────────────────────────────────────
// Exact title match: +50
// Partial title: +30
// Content match: +25
// Description match: +15
// Category/tag match: +10
function scoreResult(result: SearchableItem, words: string[]): number {
  let score = 0
  const title = result.title.toLowerCase()
  const desc = (result.description || "").toLowerCase()
  const content = (result.content || "").toLowerCase()
  const field = (result.field || "").toLowerCase()
  const categoryStr = (result.type === "category" ? title : field)

  for (const w of words) {
    const lowerW = w.toLowerCase()
    
    // Title checks
    if (title === lowerW) {
      score += 50
    } else if (title.includes(lowerW)) {
      score += 30
    }
    
    // Deep content checks
    if (content.includes(lowerW)) score += 25
    
    // Description checks
    if (desc.includes(lowerW)) score += 15
    
    // Category / Tag checks
    if (categoryStr.includes(lowerW)) score += 10
  }
  
  // ✅ ADDITIONAL BOOST:
  // Journal results must receive a priority boost to ensure visibility
  if (result.type === "journal") {
    score += 40
  }
  
  return score
}

const app = new Hono()

app.get("/", zValidator("query", searchQuerySchema), async (c) => {
  try {
    const { q, type, limit: limitStr } = c.req.valid("query")
    const limit = Math.min(parseInt(limitStr, 10) || 20, 50)

    const words = q.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      return c.json({ success: true, data: { results: [], total: 0, query: q } })
    }

    const promises: Promise<SearchableItem[]>[] = []
    
    // ─── Fault Isolation Protocol ─────────────────────────────────────────────────
    let hasError = false
    const safePromise = <T extends SearchableItem>(promise: Promise<T[]>) => 
      withTimeout(promise, 3000).catch((error) => {
        hasError = true
        console.error("[SEARCH_QUERY_ERROR]", error.message || error)
        return [] as T[]
      })

    const requestAll = type === "all"

    // 1. Search Journals
    if (requestAll || type === "journal") {
      promises.push(
        safePromise(
          prisma.journal
            .findMany({
              where: {
                status: "active",
                AND: words.map((w) => ({
                  OR: [
                    { title: { contains: w } },
                    { description: { contains: w } },
                    { aims_and_scope: { contains: w } },
                    { field: { contains: w } },
                    { publisher: { contains: w } },
                  ],
                })),
              },
              select: { id: true, title: true, description: true, aims_and_scope: true, field: true },
              take: limit,
            })
            .then((journals) =>
              journals.map((j) => ({
                id: `journal-${j.id.toString()}`,
                type: "journal" as const,
                title: j.title,
                description: j.description?.slice(0, 150) || "",
                content: (j.aims_and_scope || j.description || "").slice(0, 500),
                url: `/journals/${j.id}`,
                field: j.field,
              }))
            )
        )
      )

      // Indirectly extract Journals from PublishedArticles (CASE 2: Prisma Indirect Source)
      promises.push(
        safePromise(
          prisma.publishedArticle
            .findMany({
              where: {
                journal: {
                  AND: words.map((w) => ({
                    OR: [
                      { title: { contains: w } },
                      { description: { contains: w } },
                      { aims_and_scope: { contains: w } },
                    ],
                  })),
                },
              },
              include: { journal: { select: { id: true, title: true, description: true, aims_and_scope: true, field: true } } },
              take: limit,
            })
            .then((articles) => {
              const uJournals = new Map<string, { id: bigint; title: string; description: string | null; aims_and_scope: string | null; field: string }>()
              articles.forEach((a) => {
                if (a.journal && !uJournals.has(a.journal.id.toString())) {
                  uJournals.set(a.journal.id.toString(), a.journal)
                }
              })
              return Array.from(uJournals.values()).map((j) => ({
                id: `journal-${j.id.toString()}`,
                type: "journal" as const,
                title: j.title,
                description: j.description?.slice(0, 150) || "",
                content: (j.aims_and_scope || j.description || "").slice(0, 500),
                url: `/journals/${j.id}`,
                field: j.field,
              }))
            })
        )
      )
    }

    // 2. Search Articles (Deep content retrieval logic)
    if (requestAll || type === "article") {
      promises.push(
        safePromise(
          prisma.publishedArticle
            .findMany({
              where: {
                AND: words.map((w) => ({
                  OR: [
                    { submission: { manuscript_title: { contains: w } } },
                    { submission: { abstract: { contains: w } } },
                    { submission: { author_name: { contains: w } } },
                  ]
                }))
              },
              include: { submission: { select: { manuscript_title: true, abstract: true, author_name: true } }, journal: { select: { field: true } } },
              take: limit,
            })
            .then((articles) => 
               articles.map((a) => ({
                 id: `article-${a.id.toString()}`,
                 type: "article" as const,
                 title: a.submission?.manuscript_title || "Unknown Article",
                 description: `Authored by ${a.submission?.author_name || 'N/A'}.`,
                 content: a.submission?.abstract || "",
                 url: a.doi ? `/article/${a.doi}` : `/article-id/${a.id}`,
                 field: a.journal?.field
               }))
            )
        )
      )
    }

    // 3. Search Authors (AdminUser logic mapping)
    if (requestAll || type === "author") {
       promises.push(
         safePromise(
           prisma.adminUser
             .findMany({
               where: {
                 AND: words.map((w) => ({
                   OR: [
                     { full_name: { contains: w } },
                     { affiliation: { contains: w } },
                     { biography: { contains: w } },
                     { department: { contains: w } },
                   ]
                 }))
               },
               select: { id: true, full_name: true, affiliation: true, biography: true, department: true },
               take: limit,
             })
             .then((users) =>
               users.map((u) => ({
                 id: `author-${u.id.toString()}`,
                 type: "author" as const,
                 title: u.full_name,
                 description: u.affiliation || u.department || "Independent Researcher",
                 content: u.biography || "",
                 url: `/authors/${u.id}`,
                 field: u.department
               }))
             )
         )
       )
    }

    // 4. Dynamic Semantic Categories Engine
    if (requestAll || type === "category") {
       promises.push(
         safePromise(
           prisma.journal
             .findMany({
               where: {
                 AND: words.map((w) => ({
                   field: { contains: w }
                 }))
               },
               select: { field: true },
               distinct: ['field'],
               take: limit,
             })
             .then((categories) => 
               categories.map((c) => ({
                 id: `cat-${c.field.toLowerCase()}`,
                 type: "category" as const,
                 title: c.field,
                 description: `Explore journals and articles in ${c.field}`,
                 content: c.field,
                 url: `/journals?category=${encodeURIComponent(c.field)}`,
                 field: c.field
               }))
             )
         )
       )
    }

    // 5. Search Solutions
    if (requestAll || type === "solution") {
      promises.push(
        safePromise(
          prisma.solution
            .findMany({
              where: {
                is_published: true,
                AND: words.map((w) => ({
                  OR: [{ title: { contains: w } }, { description: { contains: w } }],
                })),
              },
              select: { id: true, title: true, description: true, icon: true },
              take: limit,
            })
            .then((solutions) =>
              solutions.map((s) => ({
                id: `solution-${s.id.toString()}`,
                type: "solution" as const,
                title: s.title,
                description: s.description?.slice(0, 150) || "",
                content: s.description || "",
                url: "/solutions",
                icon: s.icon,
              }))
            )
        )
      )
    }

    // 6. Search FAQs
    if (requestAll || type === "faq") {
      promises.push(
        safePromise(
          prisma.fAQ
            .findMany({
              where: {
                is_published: true,
                AND: words.map((w) => ({
                  OR: [{ question: { contains: w } }, { answer: { contains: w } }],
                })),
              },
              select: { id: true, question: true, answer: true, category: true },
              take: limit,
            })
            .then((faqs) =>
              faqs.map((f) => ({
                id: `faq-${f.id.toString()}`,
                type: "faq" as const,
                title: f.question,
                description: f.category ? `Category: ${f.category}` : "Help Article",
                content: f.answer || "",
                url: "/help",
                field: f.category,
              }))
            )
        )
      )
    }

    // 7. Search Static Pages
    if (requestAll || type === "page") {
      promises.push(
        safePromise(
          Promise.resolve(
            getStaticPages().filter(p =>
              words.every(w => p.content.toLowerCase().includes(w.toLowerCase()))
            ).slice(0, limit)
          )
        )
      )
    }

    const resultsArray = await Promise.all(promises)
    let rawResults = resultsArray.flat()

    // ─── Deduplication ─────────────────────────────────────────────────────────────
    const uniqueMap = new Map<string, SearchableItem>()
    rawResults.forEach((r) => {
      // Keep the element. In case of updates we just prefer the first encountered.
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r)
      }
    })
    let results = Array.from(uniqueMap.values())

    // ─── Ranking and Normalization Engine ─────────────────────────────────────────
    results = results.sort((a, b) => scoreResult(b, words) - scoreResult(a, words))
    
    // Enforce aggregate slice constraint accurately
    results = results.slice(0, limit)

    // ─── Response Payload ─────────────────────────────────────────────────────────
    const responseData: { results: SearchableItem[], total: number, query: string, warning?: string } = {
      results,
      total: results.length,
      query: q,
    }

    if (hasError) {
      responseData.warning = "Partial results. Some databases failed to respond seamlessly."
    }

    return c.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error("[GLOBAL_SEARCH_ERROR]", error)
    return c.json({ success: false, error: "Search engine failed to aggregate globally." }, 500)
  }
})

export { app as searchRouter }
