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

    // Search Journals
    if (type === "all" || type === "journal") {
      promises.push(
        prisma.journal
          .findMany({
            where: {
              status: "active",
              AND: words.map((w) => ({
                OR: [
                  { title: { contains: w } },
                  { description: { contains: w } },
                  { field: { contains: w } },
                  { publisher: { contains: w } },
                ],
              })),
            },
            select: { id: true, title: true, description: true, field: true },
            take: type === "all" ? Math.ceil(limit / 3) : limit,
            orderBy: { title: "asc" },
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
    }

    // Search Solutions
    if (type === "all" || type === "solution") {
      promises.push(
        prisma.solution
          .findMany({
            where: {
              is_published: true,
              AND: words.map((w) => ({
                OR: [{ title: { contains: w } }, { description: { contains: w } }],
              })),
            },
            select: { id: true, title: true, description: true, icon: true },
            take: type === "all" ? Math.ceil(limit / 3) : limit,
            orderBy: { display_order: "asc" },
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
    }

    // Search FAQs
    if (type === "all" || type === "faq") {
      promises.push(
        prisma.fAQ
          .findMany({
            where: {
              is_published: true,
              AND: words.map((w) => ({
                OR: [{ question: { contains: w } }, { answer: { contains: w } }],
              })),
            },
            select: { id: true, question: true, answer: true, category: true },
            take: type === "all" ? Math.ceil(limit / 3) : limit,
            orderBy: { created_at: "desc" },
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
    }

    // Search Static Pages
    if (type === "all" || type === "page") {
      promises.push(
        Promise.resolve(
          STATIC_PAGES.filter(p =>
            words.every(w => {
              const lowerW = w.toLowerCase()
              return p.title.toLowerCase().includes(lowerW) ||
                     p.description.toLowerCase().includes(lowerW) ||
                     p.field.toLowerCase().includes(lowerW)
            })
          ).slice(0, type === "all" ? Math.ceil(limit / 3) : limit).map(p => ({
            id: p.url,
            type: "page" as const,
            title: p.title,
            description: p.description,
            url: p.url,
            field: p.field
          }))
        )
      )
    }

    const resultsArray = await Promise.all(promises)
    const results = resultsArray.flat()

    return c.json({
      success: true,
      data: {
        results,
        total: results.length,
        query: q,
      },
    })
  } catch (error) {
    console.error("[SEARCH_ERROR]", error)
    return c.json({ success: false, error: "Search failed" }, 500)
  }
})

export { app as searchRouter }
