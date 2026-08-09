import { describe, it, expect } from 'vitest'
import { rowsToCsv, type CsvColumn } from '@/components/data-table/csv-export'

interface Row {
    value: unknown
}

const COLUMNS: CsvColumn<Row>[] = [{ header: 'Value', accessor: (r) => r.value }]

function cell(value: unknown): string {
    // Second line of the CSV (first is the header row).
    return rowsToCsv([{ value }], COLUMNS).split('\r\n')[1]
}

describe('csv-export', () => {
    it('neutralizes every spreadsheet formula trigger character', () => {
        expect(cell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`)
        expect(cell('=1+1')).toBe(`'=1+1`)
        expect(cell('+123')).toBe(`'+123`)
        expect(cell('-123')).toBe(`'-123`)
        expect(cell('@SUM(A1)')).toBe(`'@SUM(A1)`)
        expect(cell('\tpayload')).toBe(`'\tpayload`)
    })

    it('leaves normal values untouched', () => {
        expect(cell('Journal of Physics')).toBe('Journal of Physics')
        expect(cell('a=b inside')).toBe('a=b inside')
        expect(cell(42)).toBe('42')
        expect(cell(BigInt('9007199254740993'))).toBe('9007199254740993')
    })

    it('renders null/undefined as empty', () => {
        expect(cell(null)).toBe('')
        expect(cell(undefined)).toBe('')
    })

    it('still applies RFC 4180 quoting for commas, quotes, and newlines', () => {
        expect(cell('a,b')).toBe('"a,b"')
        expect(cell('say "hi"')).toBe('"say ""hi"""')
        expect(cell('line1\nline2')).toBe('"line1\nline2"')
    })

    it('quotes formula-neutralized values containing separators', () => {
        // Prefix applied first, then quoting — both protections compose.
        expect(cell('=cmd,arg')).toBe(`"'=cmd,arg"`)
    })

    it('emits a header row', () => {
        expect(rowsToCsv([], COLUMNS)).toBe('Value')
    })
})
