/**
 * Client-side CSV export for DataTable. BigInt-safe (everything is
 * stringified), quotes fields per RFC 4180, and neutralizes spreadsheet
 * formula injection: exported values come from user-supplied content
 * (submission titles, author names, …), so a leading `=`, `+`, `-`, `@`,
 * tab, or CR would otherwise execute as a formula when the CSV is opened
 * in Excel/Sheets. Such values get the standard OWASP single-quote prefix.
 */

export interface CsvColumn<TData> {
    header: string
    accessor: (row: TData) => unknown
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/

function csvEscape(value: unknown): string {
    let s = value === null || value === undefined ? "" : String(value)
    if (FORMULA_TRIGGER.test(s)) {
        s = `'${s}`
    }
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function rowsToCsv<TData>(rows: TData[], columns: CsvColumn<TData>[]): string {
    const header = columns.map((c) => csvEscape(c.header)).join(",")
    const body = rows.map((row) => columns.map((c) => csvEscape(c.accessor(row))).join(","))
    return [header, ...body].join("\r\n")
}

export function downloadCsv<TData>(rows: TData[], columns: CsvColumn<TData>[], filename: string): void {
    const csv = rowsToCsv(rows, columns)
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}
