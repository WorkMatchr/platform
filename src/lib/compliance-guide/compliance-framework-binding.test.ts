import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COMPLIANCE_FRAMEWORK_BINDING as binding } from './compliance-framework-binding'
import { COMPLIANCE_GUIDE_VERSION } from './compliance-guide'
import { COMPLIANCE_REPORT_VERSION } from './compliance-report'

describe('Expliciete frameworkbinding van de bestaande wijzer', () => {
  it('bindt uitsluitend de bestaande evaluator en versies, zonder nieuwste/draft-fallback', () => {
    expect(binding.guideVersion).toBe(String(COMPLIANCE_GUIDE_VERSION))
    expect(binding.reportVersion).toBe(COMPLIANCE_REPORT_VERSION)
    const evaluator = readFileSync('src/lib/compliance-guide/compliance-guide.ts', 'utf8').replace(/\r\n/g, '\n')
    expect(createHash('sha256').update(evaluator).digest('hex')).toBe(binding.checksum)
    const migration = readFileSync('prisma/migrations/20261015180000_register_legacy_compliance_framework/migration.sql', 'utf8')
    for (const value of [binding.id, binding.frameworkCode, binding.checksum]) expect(migration).toContain(value)
    expect(migration).not.toMatch(/\b(?:UPDATE|DELETE|TRUNCATE)\s/i)
  })

  it('herstelt exact de aantoonbaar toegepaste SQL, afgezien van LF/CRLF', () => {
    const sql = readFileSync('prisma/migrations/20261001113000_add_compliance_domain_versioning_foundation/migration.sql', 'utf8').replace(/\r\n/g, '\n')
    expect(createHash('sha256').update(sql).digest('hex')).toBe('976cf9391e9540116899c2556494659da98ab7d665db18c57c08489608a0e450')
    expect(createHash('sha256').update(sql.replace(/\n/g, '\r\n')).digest('hex')).toBe('119c864839d38488b8886c9f1c62275d2ca5f0ed496418f81e2f776e908c923c')
  })
})
