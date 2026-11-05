import { createHash } from 'node:crypto'
export type MigrationFile = { name: string; bytes: Uint8Array }
export type MigrationRecord = { migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }
const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')

/** Observe LF/CRLF-equivalent scripts; never change an SQL file or persisted checksum. */
export function inspectMigrationHistory(files: MigrationFile[], records: MigrationRecord[]) {
  const active = records.filter(row => !row.rolled_back_at)
  const applied = active.filter(row => row.finished_at)
  const lineEndingEquivalent: string[] = [], checksumMismatches: string[] = []
  for (const row of applied) {
    const file = files.find(item => item.name === row.migration_name)
    if (!file || !/^[a-f0-9]{64}$/.test(row.checksum)) { checksumMismatches.push(row.migration_name); continue }
    if (hash(file.bytes) === row.checksum) continue
    const lf = Buffer.from(file.bytes).toString('utf8').replace(/\r\n/g, '\n')
    if (hash(lf) === row.checksum || hash(lf.replace(/\n/g, '\r\n')) === row.checksum) lineEndingEquivalent.push(row.migration_name)
    else checksumMismatches.push(row.migration_name)
  }
  const duplicateApplied = applied.filter((row, i) => applied.findIndex(item => item.migration_name === row.migration_name) !== i).map(row => row.migration_name)
  const pending = files.filter(file => !applied.some(row => row.migration_name === file.name)).map(file => file.name)
  const failed = active.filter(row => !row.finished_at).map(row => row.migration_name)
  return { status: pending.length || failed.length || checksumMismatches.length || duplicateApplied.length ? 'FAIL' as const : 'PASS' as const,
    total: files.length, applied: applied.length, exactMatches: applied.length - lineEndingEquivalent.length - checksumMismatches.length,
    lineEndingEquivalent, checksumMismatches, duplicateApplied, pending, failed }
}
