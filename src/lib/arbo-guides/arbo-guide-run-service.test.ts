import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { arboGuideReportSnapshotSchema, fingerprintArboGuideRun } from './arbo-guide-run-service'

vi.mock('server-only', () => ({}))

const report = {
  schemaVersion: 1 as const,
  tier: 'BASIC' as const,
  organizationName: 'Voorbeeld BV',
  scannedAt: '2026-08-20T12:00:00.000Z',
  assessmentVersion: 1,
  reportVersion: '1.0',
  summary: { order: 1, action: 0, check: 0, notApplicable: 0 },
  results: [{
    id: 'policy', title: 'Arbobeleid', status: 'ORDER' as const, statusLabel: 'Op orde',
    explanation: 'Het beleid is georganiseerd.', nextStep: 'Blijf het beleid periodiek controleren.',
    relevance: 'Samenhangend beleid helpt arbeidsrisico’s beheersen.', sources: [],
    extended: { answerKeys: ['generalPolicy'], legalBasisAvailable: true, priority: 'NORMAL' as const },
  }],
  attentionItems: [], sources: [], disclaimer: 'Indicatief overzicht.', extendedCapabilities: [],
}

describe('ArboGuideRun-contract', () => {
  it('accepteert een versieerbaar rapport en maakt een deterministische fingerprint', () => {
    expect(arboGuideReportSnapshotSchema.parse(report)).toEqual(report)
    const input = { guideType: 'COMPLIANCE' as const, guideVersion: '1', reportVersion: '1.0', answersSnapshot: { generalPolicy: 'YES' }, reportSnapshot: report }
    expect(fingerprintArboGuideRun(input)).toBe(fingerprintArboGuideRun({ ...input, answersSnapshot: { generalPolicy: 'YES' } }))
    expect(fingerprintArboGuideRun(input)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('legt additieve, immutable en evidence-verplichte databaseborging vast', () => {
    const sql = readFileSync(join(process.cwd(), 'prisma/migrations/20260820100000_add_arbo_guide_runs/migration.sql'), 'utf8')
    expect(sql).toContain('CREATE TABLE "ArboGuideRun"')
    expect(sql).toContain('CREATE TABLE "ArboGuideRunResult"')
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(sql).toContain('append-only')
    expect(sql).toContain('ON DELETE RESTRICT')
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE)\b/)
    expect(sql).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO)\s+"(?:User|Organization|Knowledge)/)
  })
})
