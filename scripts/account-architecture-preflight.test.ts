import { describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import {
  assertReadOnlySql,
  buildPreflightReport,
  collectPreflightSnapshot,
  createReadOnlyQueryExecutor,
  renderMarkdown,
  runInReadOnlyTransaction,
  stableJson,
  type PreflightSnapshot,
  type ReportMetadata,
  type UserRecord,
} from './account-architecture-preflight'

const now = '2026-07-17T12:00:00.000Z'

function user(id: string, email: string, status: UserRecord['status'] = 'ACTIVE'): UserRecord {
  return {
    id,
    email,
    displayName: `Gebruiker ${id}`,
    emailVerified: status === 'ACTIVE',
    platformRole: 'USER',
    status,
    createdByUserId: null,
    migrationClassification: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    archivedAt: status === 'ARCHIVED' ? '2026-06-01T00:00:00.000Z' : null,
  }
}

function snapshotFixture(): PreflightSnapshot {
  const users = [
    user('u-zero', 'zero@example.invalid'),
    user('u-one', 'Owner@Example.invalid'),
    user('u-multi', 'multi@example.invalid'),
    user('u-review', 'review@example.invalid'),
    user('u-auditor', 'audit@example.invalid'),
    user('u-duplicate', ' owner@example.invalid '),
    user('u-archived', 'archived@example.invalid', 'ARCHIVED'),
  ]
  return {
    users,
    organizations: [
      { id: 'o-one', name: 'Organisatie Eén', organizationType: 'CLIENT', status: 'ACTIVE', systemKey: null, archivedAt: null, createdAt: now },
      { id: 'o-two', name: 'Organisatie Twee', organizationType: 'PROVIDER', status: 'ACTIVE', systemKey: null, archivedAt: null, createdAt: now },
      { id: 'o-no-owner', name: 'Zonder eigenaar', organizationType: 'CLIENT', status: 'ACTIVE', systemKey: null, archivedAt: null, createdAt: now },
    ],
    memberships: [
      { id: 'm-one', userId: 'u-one', organizationId: 'o-one', organizationName: 'Organisatie Eén', organizationStatus: 'ACTIVE', role: 'OWNER', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'm-multi-a', userId: 'u-multi', organizationId: 'o-one', organizationName: 'Organisatie Eén', organizationStatus: 'ACTIVE', role: 'MEMBER', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'm-multi-b', userId: 'u-multi', organizationId: 'o-two', organizationName: 'Organisatie Twee', organizationStatus: 'ACTIVE', role: 'ADMIN', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'm-duplicate', userId: 'u-duplicate', organizationId: 'o-no-owner', organizationName: 'Zonder eigenaar', organizationStatus: 'ACTIVE', role: 'MEMBER', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: 'm-archived', userId: 'u-archived', organizationId: 'o-two', organizationName: 'Organisatie Twee', organizationStatus: 'ACTIVE', role: 'OWNER', status: 'SUSPENDED', createdAt: now, updatedAt: now },
    ],
    auth: users.map((item) => ({
      userId: item.id,
      accountCount: item.id === 'u-zero' ? 0 : 1,
      passwordCredentialCount: item.id === 'u-archived' ? 1 : 0,
      activeSessionCount: item.id === 'u-archived' ? 1 : 0,
      expiredSessionCount: item.id === 'u-one' ? 1 : 0,
      lastSessionActivityAt: item.id === 'u-multi' ? now : null,
      verificationCount: 0,
      activeVerificationCount: 0,
    })),
    permissions: [
      { grantId: 'g-review', userId: 'u-review', permission: 'PROVIDER_REVIEWER', validFrom: '2026-01-01T00:00:00.000Z', validUntil: null, revokedAt: null, grantedByUserId: 'u-one' },
      { grantId: 'g-auditor', userId: 'u-auditor', permission: 'PROVIDER_AUDITOR', validFrom: '2026-01-01T00:00:00.000Z', validUntil: null, revokedAt: null, grantedByUserId: 'u-one' },
    ],
    dependencies: [
      { userId: 'u-multi', tableName: 'Intake', columnName: 'createdByUserId', recordCount: 2 },
      { userId: 'u-archived', tableName: 'AdminActionLog', columnName: 'actorUserId', recordCount: 1 },
    ],
    provisioningCandidates: [],
    accountProvisioningEvents: [],
    organizationProvisioningEvents: [],
    integrity: {
      orphanMembershipUsers: 1,
      orphanMembershipOrganizations: 0,
      orphanAccounts: 0,
      orphanSessions: 0,
      orphanPermissionSubjects: 0,
      orphanPermissionGranters: 0,
      orphanPermissionRevokers: 0,
      orphanAdminActionActors: 0,
      unmatchedVerificationRecords: 1,
      assignmentTenantMismatches: 0,
      assignmentLocationTenantMismatches: 0,
      providerProfileTypeMismatches: 0,
      providerDossierCandidateMismatches: 0,
      providerDossierReviewCaseMismatches: 0,
      providerDossierFindingMismatches: 0,
      providerVerificationBindingMismatches: 0,
      providerQualificationBindingMismatches: 0,
    },
    staticIndicators: [{ code: 'STATIC_ACTIVE_ORGANIZATION_COOKIE', file: 'src/example.ts', matches: 1, description: 'Bestand gebruikt de actieve-organisatiecookie.' }],
  }
}

function metadata(redacted = false): ReportMetadata {
  return {
    generatedAt: now,
    databaseEnvironment: { hostType: 'LOCAL', databaseFingerprint: 'fixture', schema: 'public' },
    git: { commit: 'abc123', dirty: true, changedPathCount: 4 },
    redacted,
  }
}

describe('ADR-013 accountarchitectuur-preflight', () => {
  it('classificeert nul, één en meerdere memberships zonder een organisatie te kiezen', () => {
    const report = buildPreflightReport(snapshotFixture(), metadata())
    expect(report.summary.usersWithZeroMemberships).toBe(3)
    expect(report.summary.usersWithExactlyOneMembership).toBe(3)
    expect(report.summary.usersWithMultipleMemberships).toBe(1)
    const multi = report.findings.find((finding) => finding.code === 'ADR013_NEW_MULTI_MEMBERSHIP')
    expect(multi?.severity).toBe('BLOCKER')
    expect(multi?.recommendedAction).toContain('handmatig')
    expect(multi?.evidence).toMatchObject({ membershipCount: 2 })
  })

  it('herkent een correct geblokkeerd account met behouden membership en credentials', () => {
    const snapshot = snapshotFixture()
    const blocked = snapshot.users.find((item) => item.id === 'u-one')!
    blocked.status = 'BLOCKED'
    const auth = snapshot.auth.find((item) => item.userId === blocked.id)!
    auth.passwordCredentialCount = 1
    auth.activeSessionCount = 0
    auth.activeVerificationCount = 0
    snapshot.accountProvisioningEvents.push({
      id: 'blocked-event', eventType: 'ACCOUNT_BLOCKED', subjectUserId: blocked.id,
      actorUserId: 'u-multi', reasonCode: 'SECURITY_CONCERN', correlationId: 'block:test',
      idempotencyKey: 'block:test:u-one', occurredAt: now,
    })

    const report = buildPreflightReport(snapshot, metadata())
    expect(report.findings.find((finding) => finding.code === 'ADR013_BLOCKED_ACCOUNT_ACCESS_REVOKED')).toMatchObject({
      severity: 'INFO', phaseStatus: 'RESOLVED_PHASE_2B',
    })
    expect(report.findings.find((finding) => finding.code === 'ADR013_BLOCKED_ACCOUNT_ACTIVE_MEMBERSHIP_RETAINED')).toMatchObject({
      severity: 'INFO', phaseStatus: 'RESOLVED_PHASE_2B',
    })
    expect(report.findings.some((finding) => finding.code === 'ADR013_BLOCKED_ACCOUNT_WITH_ACTIVE_ACCESS')).toBe(false)
  })

  it('blokkeert een BLOCKED-account met een actieve sessie', () => {
    const snapshot = snapshotFixture()
    const blocked = snapshot.users.find((item) => item.id === 'u-one')!
    blocked.status = 'BLOCKED'
    const auth = snapshot.auth.find((item) => item.userId === blocked.id)!
    auth.activeSessionCount = 1

    const report = buildPreflightReport(snapshot, metadata())
    expect(report.findings.find((finding) => finding.code === 'ADR013_BLOCKED_ACCOUNT_WITH_ACTIVE_ACCESS')).toMatchObject({
      severity: 'BLOCKER', phaseStatus: 'OPEN_PHASE_2B',
    })
  })

  it('rapporteert organisaties zonder OWNER en precies één OWNER', () => {
    const report = buildPreflightReport(snapshotFixture(), metadata())
    expect(report.findings.some((finding) => finding.code === 'ORGANIZATION_WITHOUT_ACTIVE_OWNER' && finding.entityId === 'o-no-owner')).toBe(true)
    expect(report.findings.some((finding) => finding.code === 'LAST_OWNER_RISK' && finding.entityId === 'o-one')).toBe(true)
  })

  it('onderscheidt reviewer zonder beheerorganisatie en auditor zonder organisatie', () => {
    const report = buildPreflightReport(snapshotFixture(), metadata())
    expect(report.findings.find((finding) => finding.entityId === 'g-review')?.code).toBe('PLATFORM_REVIEW_ACTOR_MANAGEMENT_ORG_UNVERIFIABLE')
    const auditor = report.findings.find((finding) => finding.entityId === 'g-auditor')
    expect(auditor?.code).toBe('PLATFORM_AUDITOR_ALIGNED')
    expect(auditor?.severity).toBe('INFO')
  })

  it('herkent de afgeronde Fase 2A-classificatie, UNKNOWN-historie en platformorganisatie', () => {
    const snapshot = snapshotFixture()
    const temporaryUser = snapshot.users.find((item) => item.id === 'u-zero')!
    temporaryUser.status = 'INVITED'
    temporaryUser.migrationClassification = 'MIGRATION_TEMP'
    snapshot.accountProvisioningEvents.push({
      id: 'event-user', eventType: 'MIGRATED_UNKNOWN', subjectUserId: temporaryUser.id,
      actorUserId: null, reasonCode: 'ADR013_MIGRATION_TEMP_CLASSIFIED', correlationId: 'phase2a',
      idempotencyKey: 'phase2a:user',
    })
    snapshot.organizations.push({
      id: 'o-platform', name: 'WorkMatchr Platform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE',
      systemKey: 'WORKMATCHR_PLATFORM', archivedAt: null, createdAt: now,
    })
    for (const [index, eventType] of (['ORGANIZATION_BOOTSTRAPPED', 'SYSTEM_IDENTITY_ASSIGNED', 'GOVERNANCE_ACTIVATED'] as const).entries()) {
      snapshot.organizationProvisioningEvents.push({
        id: `platform-event-${index}`, eventType, organizationId: 'o-platform', actorType: 'SYSTEM',
        actorUserId: null, reasonCode: `PHASE2A_${eventType}`, correlationId: 'phase2a',
        idempotencyKey: `phase2a:platform:${index}`,
      })
    }

    const report = buildPreflightReport(snapshot, metadata())
    expect(report.findings.find((finding) => finding.entityId === temporaryUser.id && finding.category === 'ZERO_MEMBERSHIP')).toMatchObject({
      code: 'ADR013_MIGRATION_TEMP_WITHOUT_MEMBERSHIP', severity: 'INFO', phaseStatus: 'RESOLVED_PHASE_2A',
    })
    expect(report.findings.find((finding) => finding.entityId === temporaryUser.id && finding.category === 'PROVISIONING')).toMatchObject({
      code: 'PROVISIONING_MIGRATED_UNKNOWN_RECORDED', phaseStatus: 'RESOLVED_PHASE_2A',
    })
    expect(report.findings.find((finding) => finding.code === 'ADR013_MANAGEMENT_ORGANIZATION_ACTIVE')).toMatchObject({
      severity: 'INFO', phaseStatus: 'RESOLVED_PHASE_2A',
    })
    expect(report.findings.some((finding) => finding.entityId === 'o-platform' && finding.category === 'OWNER_RISK')).toBe(false)
  })

  it('detecteert genormaliseerde e-mailduplicaten, verweesde memberships en ontbrekende authidentiteiten', () => {
    const report = buildPreflightReport(snapshotFixture(), metadata())
    expect(report.findings.some((finding) => finding.code === 'EMAIL_CASE_INSENSITIVE_DUPLICATE')).toBe(true)
    expect(report.findings.some((finding) => finding.code === 'REFERENTIAL_ORPHAN_MEMBERSHIP_USERS')).toBe(true)
    expect(report.findings.some((finding) => finding.code === 'BETTER_AUTH_USER_WITHOUT_ACCOUNT' && finding.entityId === 'u-zero')).toBe(true)
  })

  it('houdt ARCHIVED expliciet ambigu en toont alleen minimale authmetadata', () => {
    const report = buildPreflightReport(snapshotFixture(), metadata())
    const archived = report.findings.find((finding) => finding.code === 'ADR013_ARCHIVED_STATUS_AMBIGUOUS')
    expect(archived?.severity).toBe('BLOCKER')
    expect(archived?.recommendedAction).toContain('handmatig')
    expect(JSON.stringify(archived)).not.toMatch(/passwordHash|passwordValue|credentialValue|sessionToken/i)
    expect(archived?.evidence).toMatchObject({ auth: { passwordCredentialCount: 1 } })
  })

  it('redacteert e-mailadressen en namen zonder secrets te introduceren', () => {
    const report = buildPreflightReport(snapshotFixture(), metadata(true))
    const json = stableJson(report)
    expect(json).not.toContain('owner@example.invalid')
    expect(json).not.toContain('Gebruiker u-one')
    expect(json).toContain('[REDACTED:')
    expect(json).not.toMatch(/sessionToken|refreshToken|passwordHash/i)
  })

  it('produceert bij dezelfde snapshot en metadata deterministische JSON', () => {
    const report = buildPreflightReport(snapshotFixture(), metadata())
    const first = stableJson(report)
    const second = stableJson(buildPreflightReport(snapshotFixture(), metadata()))
    expect(second).toBe(first)
    const markdown = renderMarkdown(report)
    expect(markdown).toContain('### A. Algemene aantallen')
    expect(markdown).toContain('### K. Tenantisolatie-indicatoren')
  })

  it('faalt gesloten bij queryfouten', async () => {
    const query = vi.fn().mockRejectedValue(new Error('schema ontbreekt'))
    await expect(collectPreflightSnapshot({ query }, [])).rejects.toThrow('schema ontbreekt')
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('weigert iedere write en start PostgreSQL expliciet READ ONLY', async () => {
    expect(() => assertReadOnlySql("SELECT * FROM \"AdminActionLog\" WHERE action ILIKE '%CREATE%'" )).not.toThrow()
    expect(() => assertReadOnlySql('UPDATE "User" SET status = \'ACTIVE\'')).toThrow('PREFLIGHT_WRITE_GUARD')
    expect(() => assertReadOnlySql('WITH changed AS (DELETE FROM "User" RETURNING *) SELECT * FROM changed')).toThrow('PREFLIGHT_WRITE_GUARD')
    const rawQuery = vi.fn(async (sql: string) => {
      void sql
      return { rows: [] }
    })
    const release = vi.fn()
    const pool = { connect: vi.fn(async () => ({ query: rawQuery, release })) } as unknown as Pool

    await expect(runInReadOnlyTransaction(pool, async (client) => {
      await createReadOnlyQueryExecutor(client).query('DELETE FROM "Session"')
    })).rejects.toThrow('PREFLIGHT_WRITE_GUARD')

    expect(rawQuery.mock.calls[0]?.[0]).toContain('READ ONLY')
    expect(rawQuery.mock.calls.some(([sql]) => String(sql).startsWith('DELETE'))).toBe(false)
    expect(rawQuery.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true)
    expect(release).toHaveBeenCalledOnce()
  })
})
