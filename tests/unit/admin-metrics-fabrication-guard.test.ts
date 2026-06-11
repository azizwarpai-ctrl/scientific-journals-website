import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Regression guard for A3/A4 — admin metrics fabrication.
 *
 * Before this guard landed, `app/admin/analytics/page.tsx` displayed
 * three "Last 7 days" figures derived from a hard-coded multiplier
 * (`Math.floor((submissionsCount || 0) * 0.15)` and friends) and three
 * "System Health" rows whose values were the literal string "Operational"
 * with no probe behind them. Both shapes look real to a manager but
 * carry no information.
 *
 * The fix wires both surfaces to real probes / aggregates. This guard
 * fails the suite if anyone reintroduces either shape in the two pages
 * the analysis named.
 */

const GUARDED_FILES = [
  "app/admin/analytics/page.tsx",
  "app/admin/dashboard/page.tsx",
] as const

/**
 * Matches a `Math.floor(<…> * 0.<one or more digits>)` expression — the
 * exact fabrication shape removed by A3. The lazy `[\s\S]*?` is on
 * purpose: the real bug had a nested `)` inside the floor call
 * (`Math.floor((submissionsCount || 0) * 0.15)`) which would defeat a
 * `[^)]*` guard. Anchored on `Math.floor(` so unrelated `* 0.5`-style
 * ratios in CSS / Tailwind class names are not flagged.
 */
const MATH_FLOOR_FABRICATION = /Math\.floor\s*\([\s\S]*?\*\s*0\.\d+/

/**
 * The hard-coded health-status literal removed by A4. Quoted on purpose
 * — we only care about the string presented to the user. A comment
 * mentioning "Operational" in passing is stripped before this regex
 * runs (see `stripCommentNoise`).
 */
const HARDCODED_OPERATIONAL = />\s*Operational\s*</

/** Strip `// …` line comments and entire block-comment lines. */
function stripCommentNoise(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart()
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        return ""
      }
      return line.replace(/\/\/.*$/, "")
    })
    .join("\n")
}

interface Offender {
  file: string
  line: number
  text: string
  kind: "math-floor-multiplier" | "hardcoded-operational"
}

function scan(file: string): Offender[] {
  const cleaned = stripCommentNoise(readFileSync(join(process.cwd(), file), "utf8"))
  const offenders: Offender[] = []
  for (const [idx, line] of cleaned.split("\n").entries()) {
    if (MATH_FLOOR_FABRICATION.test(line)) {
      offenders.push({ file, line: idx + 1, text: line.trim(), kind: "math-floor-multiplier" })
    }
    if (HARDCODED_OPERATIONAL.test(line)) {
      offenders.push({ file, line: idx + 1, text: line.trim(), kind: "hardcoded-operational" })
    }
  }
  return offenders
}

describe("Admin metrics — fabrication guard", () => {
  it("contains no `Math.floor(* 0.x)`-style fabricated counts in the guarded pages", () => {
    const offenders = GUARDED_FILES.flatMap(scan).filter((o) => o.kind === "math-floor-multiplier")
    expect(offenders).toEqual([])
  })

  it("contains no hard-coded \"Operational\" status text in the guarded pages", () => {
    const offenders = GUARDED_FILES.flatMap(scan).filter((o) => o.kind === "hardcoded-operational")
    expect(offenders).toEqual([])
  })
})

describe("Admin metrics — guard regexes self-test", () => {
  it("flags the original fabrication: Math.floor((submissionsCount || 0) * 0.15)", () => {
    expect(MATH_FLOOR_FABRICATION.test("Math.floor((submissionsCount || 0) * 0.15)")).toBe(true)
  })

  it("flags Math.floor with a different fraction", () => {
    expect(MATH_FLOOR_FABRICATION.test("{Math.floor((reviewsCount || 0) * 0.2)}")).toBe(true)
  })

  it("flags the hard-coded health literal `>Operational<`", () => {
    expect(HARDCODED_OPERATIONAL.test('<span className="…">Operational</span>')).toBe(true)
  })

  it("does NOT flag legitimate ratio computation (no Math.floor)", () => {
    expect(MATH_FLOOR_FABRICATION.test(`width: \`\${(count / total) * 100}%\``)).toBe(false)
  })

  it("does NOT flag Math.floor that does not multiply by a 0.x fraction", () => {
    expect(MATH_FLOOR_FABRICATION.test("Math.floor(totalSeconds / 60)")).toBe(false)
  })

  it("does NOT flag a `\"Operational\"` string literal in a non-JSX context", () => {
    expect(HARDCODED_OPERATIONAL.test('const STATUSES = ["Operational", "Down"]')).toBe(false)
  })
})
