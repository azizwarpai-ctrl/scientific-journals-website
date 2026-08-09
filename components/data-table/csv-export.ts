/**
 * Client-side CSV export for DataTable. BigInt-safe (everything is
 * stringified), quotes fields per RFC 4180.
 */

export interface CsvColumn<TData> {
    header: string
    accessor: (row: TData) => unknown
}

function csvEscape(value: unknown): string {
    const s = value === null || value === undefined ? "" : String(value)
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
