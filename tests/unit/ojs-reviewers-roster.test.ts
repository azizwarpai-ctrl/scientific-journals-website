import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * listOjsReviewers now sources the roster from OJS Reviewer-role membership
 * (role_id 4096) LEFT-joined to review_assignments, so reviewers appear even
 * with zero assignments. This asserts the query shape (ojsQuery is mocked).
 */

const hoisted = vi.hoisted(() => ({ ojsQuery: vi.fn() }))

vi.mock("@/src/features/ojs/server/ojs-client", () => ({
    ojsQuery: hoisted.ojsQuery,
}))

import { listOjsReviewers } from "@/src/features/reviews/server/ojs-review-service"

beforeEach(() => {
    hoisted.ojsQuery.mockReset()
})

describe("listOjsReviewers (role-based roster)", () => {
    it("counts and lists reviewer-role users via role membership + LEFT JOIN assignments", async () => {
        hoisted.ojsQuery
            .mockResolvedValueOnce([{ total: 0 }]) // count query
            .mockResolvedValueOnce([]) // main query (no rows → no mapping)

        const result = await listOjsReviewers({ page: 1, limit: 20 })
        expect(result).toEqual({ rows: [], total: 0 })

        const countSql = hoisted.ojsQuery.mock.calls[0][0] as string
        expect(countSql).toContain("COUNT(*)")
        expect(countSql).toContain("ug.role_id = 4096")

        const mainSql = hoisted.ojsQuery.mock.calls[1][0] as string
        expect(mainSql).toContain("ug.role_id = 4096")
        expect(mainSql).toContain("LEFT JOIN review_assignments ra ON ra.reviewer_id = u.user_id")
        expect(mainSql).toContain("COUNT(ra.review_id) AS total")
        // A reviewer with no assignments must not be counted as active via the
        // LEFT-join phantom row.
        expect(mainSql).toContain("ra.review_id IS NOT NULL")
    })

    it("adds a search predicate keyed on the user, not the assignment", async () => {
        hoisted.ojsQuery.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([])
        await listOjsReviewers({ page: 1, limit: 20, search: "smith" })
        const countSql = hoisted.ojsQuery.mock.calls[0][0] as string
        expect(countSql).toContain("us.user_id = u.user_id")
        const params = hoisted.ojsQuery.mock.calls[0][1] as string[]
        expect(params).toContain("%smith%")
    })
})
