import { describe, it, expect } from "vitest"
import { rowsToCsv, rowsToJson, type CsvColumn } from "@/components/data-table/csv-export"

interface Row {
    name: string
    count: number
    big: bigint
    when: string
}

const columns: CsvColumn<Row>[] = [
    { header: "Name", accessor: (r) => r.name },
    { header: "Count", accessor: (r) => r.count },
    { header: "Big", accessor: (r) => r.big },
    { header: "When", accessor: (r) => r.when },
]

const rows: Row[] = [
    { name: "Ada", count: 3, big: 9007199254740993n, when: "2026-01-02" },
    { name: "=cmd()", count: 0, big: 0n, when: "" },
]

describe("rowsToCsv", () => {
    it("emits header + rows, quotes/escapes, neutralizes formula injection, stringifies bigint", () => {
        const csv = rowsToCsv(rows, columns)
        const lines = csv.split("\r\n")
        expect(lines[0]).toBe("Name,Count,Big,When")
        expect(lines[1]).toBe("Ada,3,9007199254740993,2026-01-02")
        // Leading '=' gets an OWASP single-quote prefix.
        expect(lines[2]).toBe("'=cmd(),0,0,")
    })
})

describe("rowsToJson", () => {
    it("maps columns to keyed objects, bigint→string, empty→'' preserved, null-safe", () => {
        const json = JSON.parse(rowsToJson(rows, columns))
        expect(json).toEqual([
            { Name: "Ada", Count: 3, Big: "9007199254740993", When: "2026-01-02" },
            { Name: "=cmd()", Count: 0, Big: "0", When: "" },
        ])
    })

    it("coerces null/undefined accessors to null", () => {
        const cols: CsvColumn<{ a: string | null }>[] = [{ header: "A", accessor: (r) => r.a }]
        const json = JSON.parse(rowsToJson([{ a: null }], cols))
        expect(json).toEqual([{ A: null }])
    })
})
