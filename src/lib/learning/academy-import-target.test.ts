import { describe, expect, it } from 'vitest'
import { ACADEMY_TEST_DATABASE, ACADEMY_RC_ACCEPTANCE_DATABASE, WL003_ACCEPTANCE_DATABASE, assertAcademyDatabaseTarget } from './academy-database-policy'

const target = WL003_ACCEPTANCE_DATABASE
const valid = {
  databaseUrl: `postgresql://fixture:fixture@${target.hostname}/neondb?sslmode=verify-full`,
  projectId: target.projectId, branchId: target.branchId, nodeEnv: 'test',
}

describe('exact Academy importer acceptance targets', () => {
  it('allows only the verified WL-003 child tuple', () => {
    expect(assertAcademyDatabaseTarget(valid)).toMatchObject({ branchId: target.branchId, database: 'neondb' })
  })
  it('preserves the original Academy test target', () => {
    expect(assertAcademyDatabaseTarget({ ...valid, branchId: ACADEMY_TEST_DATABASE.branchId,
      databaseUrl: valid.databaseUrl.replace(target.hostname, ACADEMY_TEST_DATABASE.hostname),
    })).toMatchObject({ branchId: ACADEMY_TEST_DATABASE.branchId })
  })
  it('does not widen the new child target to the legacy upgrade database', () => {
    expect(() => assertAcademyDatabaseTarget({ ...valid, databaseUrl: valid.databaseUrl.replace('/neondb', '/academy_upgrade') }, 'academy_upgrade')).toThrow('ACADEMY_IMPORT_DATABASE_REFUSED')
  })
  it.each([
    { nodeEnv: 'production' }, { nodeEnv: undefined }, { vercelEnv: 'production' },
    { databaseUrl: undefined }, { databaseUrl: 'invalid' },
    { projectId: 'fixture-842b0f40ee' }, { projectId: 'unknown' }, { branchId: 'unknown' },
    { branchId: ACADEMY_TEST_DATABASE.branchId },
    { databaseUrl: valid.databaseUrl.replace(target.hostname, ACADEMY_TEST_DATABASE.hostname) },
    { databaseUrl: valid.databaseUrl.replace('verify-full', 'require') },
    { databaseUrl: valid.databaseUrl.replace('/neondb', '/other') },
    { databaseUrl: 'postgresql://fixture:fixture@127.0.0.1/neondb?sslmode=verify-full' },
  ])('refuses an unapproved or mixed identity/environment: %j', override => {
    expect(() => assertAcademyDatabaseTarget({ ...valid, ...override })).toThrow()
  })
})


describe('isolated integrated RC target never widens to arbitrary environments', () => {
  const rc = ACADEMY_RC_ACCEPTANCE_DATABASE
  const input = { ...valid, branchId: rc.branchId, databaseUrl: valid.databaseUrl.replace(target.hostname, rc.hostname) }
  it('allows the exact verified RC tuple', () => { expect(assertAcademyDatabaseTarget(input)).toMatchObject({ branchId: rc.branchId, database: 'neondb' }) })
  it.each([
    { nodeEnv: 'production' }, { vercelEnv: 'production' }, { projectId: 'unknown' }, { branchId: ACADEMY_TEST_DATABASE.branchId },
    { databaseUrl: undefined }, { databaseUrl: 'invalid' }, { databaseUrl: input.databaseUrl.replace('verify-full', 'require') },
    { databaseUrl: input.databaseUrl.replace(rc.hostname, target.hostname) }, { databaseUrl: input.databaseUrl.replace('/neondb', '/other') },
  ])('rejects a mixed identity or environment: %j', override => { expect(() => assertAcademyDatabaseTarget({ ...input, ...override })).toThrow() })
  it('refuses legacy upgrade database on the RC branch', () => { expect(() => assertAcademyDatabaseTarget({ ...input, databaseUrl: input.databaseUrl.replace('/neondb', '/academy_upgrade') }, 'academy_upgrade')).toThrow() })
})
