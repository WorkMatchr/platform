import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('financiële maintenance-runmigratie', () => {
  const migration = readFileSync(join(process.cwd(), 'prisma/migrations/20260903100000_add_financial_maintenance_runs/migration.sql'), 'utf8')

  it('registreert begrensde runs en voorkomt overlappende RUNNING-runs', () => {
    expect(migration).toContain('CREATE TABLE "FinancialMaintenanceRun"')
    expect(migration).toContain('"resultCounts" JSONB')
    expect(migration).toContain('"errorCodes" TEXT[]')
    expect(migration).toContain('"status" IN (\'RUNNING\', \'SUCCEEDED\', \'PARTIAL_FAILURE\', \'FAILED\')')
    expect(migration).toContain('"trigger" IN (\'SCHEDULER\', \'MANUAL_API\')')
    expect(migration).toContain('WHERE "status" = \'RUNNING\'')
  })
})
