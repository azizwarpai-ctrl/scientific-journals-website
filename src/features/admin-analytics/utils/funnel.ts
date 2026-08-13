import type { StatusDistribution } from "../types/charts-types"

/**
 * Derives the acceptance funnel stages (submitted, accepted, published)
 * from the status distribution counts.
 */
export function deriveFunnel(s: StatusDistribution): {
  submitted: number
  accepted: number
  published: number
} {
  const submitted = s.inReview + s.inProduction + s.published + s.declined
  return {
    submitted,
    accepted: s.inProduction + s.published,
    published: s.published,
  }
}
