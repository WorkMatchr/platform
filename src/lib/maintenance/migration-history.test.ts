import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { inspectMigrationHistory } from './migration-history'
const checksum = (text: string) => createHash('sha256').update(text).digest('hex')
const file = (text: string) => [{ name: '001', bytes: Buffer.from(text) }]
const row = (text: string) => [{ migration_name: '001', checksum: checksum(text), finished_at: new Date('2026-01-01Z'), rolled_back_at: null }]
describe('read-only migration-history verification', () => {
  it('recognizes exact bytes without altering history or files', () => {
    expect(inspectMigrationHistory(file('SELECT 1;\n'), row('SELECT 1;\n'))).toMatchObject({ status: 'PASS', exactMatches: 1, checksumMismatches: [] })
  })
  it.each([['SELECT 1;\n','SELECT 1;\r\n'], ['SELECT 1;\r\n','SELECT 1;\n']])('reports line endings separately from exact equality', (actual, historic) => {
    const files = file(actual), records = row(historic)
    expect(inspectMigrationHistory(files, records)).toMatchObject({ status: 'PASS', exactMatches: 0, lineEndingEquivalent: ['001'] })
    expect(files[0].bytes).toEqual(Buffer.from(actual)); expect(records[0].checksum).toBe(checksum(historic))
  })
  it.each(['SELECT 2;\n','SELECT 1; \n','SELECT 1;\n--changed\n'])('refuses a content/whitespace change beyond line endings', changed => {
    expect(inspectMigrationHistory(file(changed), row('SELECT 1;\n'))).toMatchObject({ status: 'FAIL', checksumMismatches: ['001'] })
  })
  it('fails closed for pending, failed, duplicate or unknown migrations', () => {
    expect(inspectMigrationHistory(file('a'), [])).toMatchObject({ status: 'FAIL', pending: ['001'] })
    expect(inspectMigrationHistory(file('a'), [{ ...row('a')[0], finished_at: null }])).toMatchObject({ status: 'FAIL', failed: ['001'] })
    expect(inspectMigrationHistory(file('a'), [...row('a'), ...row('a')])).toMatchObject({ status: 'FAIL', duplicateApplied: ['001'] })
    expect(inspectMigrationHistory([], row('a'))).toMatchObject({ status: 'FAIL', checksumMismatches: ['001'] })
  })
})
