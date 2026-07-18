import type { Prisma, PrismaClient } from '@/generated/prisma/client'
import { createHash } from 'node:crypto'
import { appendAccountProvisioningEvent, appendOrganizationProvisioningEvent } from './account-history-service'
import {
  ensurePlatformOrganization,
  findPlatformOrganization,
  WORKMATCHR_PLATFORM_ORGANIZATION,
} from './platform-organization-service'

export const ADR013_PHASE2A = {
  migrationVersion: 'ADR013_PHASE2A_V1',
  correlationId: 'ADR013_PHASE2A_PLATFORM_PROVISIONING_V1',
  existingUserIds: [
    '202fc2db-cb99-489e-a6f0-2ad1e05dcf75',
    'be4acb1b-d55c-4568-89b2-2f8cfd6babaa',
  ],
  migrationTempUserId: 'be4acb1b-d55c-4568-89b2-2f8cfd6babaa',
  tenantOrganizationIds: [
    '41ddc525-a54a-4488-98ce-7abb952fe5df',
    'cb50ce4a-69d5-40a7-8fad-32832619c23a',
  ],
  membershipIds: [
    '3a878ca6-1f8f-4af6-ba88-a1c5f1f91425',
    '49e14bc6-bc06-4601-844d-6aed0b9b8fba',
  ],
} as const

export type ApprovedUserRecord = {
  userId: string
  normalizedEmail: string
  status: 'ACTIVE' | 'INVITED'
  membershipCount: number
}

export type Phase2AAction = {
  code: string
  recordId: string
  outcome: 'WOULD_CREATE' | 'WOULD_UPDATE' | 'ALREADY_CORRECT' | 'CREATED' | 'UPDATED'
}

export type Phase2AReport = {
  mode: 'dry-run' | 'execute'
  migrationVersion: string
  correlationId: string
  platformOrganizationId: string | null
  actions: Phase2AAction[]
  blockers: string[]
}

type Phase2AClient = Prisma.TransactionClient | PrismaClient

export class Adr013Phase2AError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Adr013Phase2AError'
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function idempotencyKey(scope: string, id: string) {
  return `adr013:phase2a:v1:${scope}:${id}`
}

function fingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function protectedStateFingerprint(client: Phase2AClient) {
  const users = await client.user.findMany({
    where: { id: { in: [...ADR013_PHASE2A.existingUserIds] } },
    select: { id: true, email: true, emailVerified: true, platformRole: true, status: true, createdByUserId: true },
    orderBy: { id: 'asc' },
  })
  const memberships = await client.organizationMembership.findMany({
    select: { id: true, userId: true, organizationId: true, role: true, status: true, createdAt: true },
    orderBy: { id: 'asc' },
  })
  const accounts = await client.account.findMany({
    select: { id: true, userId: true, providerId: true, accountId: true, createdAt: true, updatedAt: true },
    orderBy: { id: 'asc' },
  })
  const sessions = await client.session.findMany({
    select: { id: true, userId: true, expiresAt: true, createdAt: true, updatedAt: true },
    orderBy: { id: 'asc' },
  })
  const verifications = await client.verification.findMany({
    select: { id: true, expiresAt: true, createdAt: true, updatedAt: true },
    orderBy: { id: 'asc' },
  })
  const permissions = await client.providerPlatformPermissionGrant.findMany({
    select: { id: true, userId: true, permission: true, validFrom: true, validUntil: true, grantedByUserId: true },
    orderBy: { id: 'asc' },
  })
  return fingerprint({ users, memberships, accounts, sessions, verifications, permissions })
}

async function assertApprovedBaseline(client: Phase2AClient, approvedUsers: ApprovedUserRecord[]) {
  const approvedById = new Map(approvedUsers.map((item) => [item.userId, item]))
  if (
    approvedUsers.length !== ADR013_PHASE2A.existingUserIds.length ||
    ADR013_PHASE2A.existingUserIds.some((userId) => !approvedById.has(userId))
  ) {
    throw new Adr013Phase2AError('Het recordbeslisrapport bevat niet exact de twee goedgekeurde Users.')
  }

  const totalUsers = await client.user.count()
  if (totalUsers !== ADR013_PHASE2A.existingUserIds.length) {
    throw new Adr013Phase2AError('Het actuele aantal Users wijkt af van de goedgekeurde recordanalyse.')
  }

  for (const userId of ADR013_PHASE2A.existingUserIds) {
    const expected = approvedById.get(userId)!
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true, createdByUserId: true, migrationClassification: true },
    })
    if (!user || normalizeEmail(user.email) !== expected.normalizedEmail || user.status !== expected.status) {
      throw new Adr013Phase2AError(`User ${userId} wijkt af van de goedgekeurde identiteit of status.`)
    }
    if (user.createdByUserId !== null) {
      throw new Adr013Phase2AError(`User ${userId} heeft onverwacht een createdByUserId.`)
    }
    const membershipCount = await client.organizationMembership.count({ where: { userId } })
    if (membershipCount !== expected.membershipCount) {
      throw new Adr013Phase2AError(`Het membershipaantal van User ${userId} wijkt af van de goedgekeurde analyse.`)
    }
    const permissionCount = await client.providerPlatformPermissionGrant.count({ where: { userId } })
    if (permissionCount !== 0) throw new Adr013Phase2AError(`User ${userId} heeft onverwachte platformpermissions.`)
  }

  const temporaryUser = await client.user.findUnique({
    where: { id: ADR013_PHASE2A.migrationTempUserId },
    select: { status: true, migrationClassification: true },
  })
  if (
    temporaryUser?.status !== 'INVITED' ||
    (temporaryUser.migrationClassification !== null && temporaryUser.migrationClassification !== 'MIGRATION_TEMP')
  ) {
    throw new Adr013Phase2AError('De tijdelijke migratiegebruiker heeft een onverwachte status of classificatie.')
  }

  const tenantOrganizations = await client.organization.findMany({
    where: { systemKey: null },
    select: { id: true },
    orderBy: { id: 'asc' },
  })
  if (
    tenantOrganizations.length !== ADR013_PHASE2A.tenantOrganizationIds.length ||
    ADR013_PHASE2A.tenantOrganizationIds.some((id) => !tenantOrganizations.some((item) => item.id === id))
  ) {
    throw new Adr013Phase2AError('De tenantorganisaties wijken af van de goedgekeurde recordanalyse.')
  }
  const memberships = await client.organizationMembership.findMany({
    select: { id: true, userId: true, role: true, status: true },
    orderBy: { id: 'asc' },
  })
  if (
    memberships.length !== ADR013_PHASE2A.membershipIds.length ||
    ADR013_PHASE2A.membershipIds.some((id) => !memberships.some((item) => item.id === id)) ||
    memberships.some((item) => item.userId !== ADR013_PHASE2A.existingUserIds[0] || item.role !== 'OWNER' || item.status !== 'ACTIVE')
  ) {
    throw new Adr013Phase2AError('De memberships of OWNER-rollen wijken af van de goedgekeurde recordanalyse.')
  }
}

async function inspectActions(client: Phase2AClient, approvedUsers: ApprovedUserRecord[]): Promise<Phase2AReport> {
  await assertApprovedBaseline(client, approvedUsers)
  const actions: Phase2AAction[] = []
  const platformOrganization = await findPlatformOrganization(client)
  actions.push({
    code: 'PLATFORM_ORGANIZATION',
    recordId: platformOrganization?.id ?? WORKMATCHR_PLATFORM_ORGANIZATION.systemKey,
    outcome: platformOrganization ? 'ALREADY_CORRECT' : 'WOULD_CREATE',
  })
  for (const [eventType, key] of [
    ['ORGANIZATION_BOOTSTRAPPED', 'organization-bootstrapped'],
    ['SYSTEM_IDENTITY_ASSIGNED', 'system-identity-assigned'],
    ['GOVERNANCE_ACTIVATED', 'governance-activated'],
  ] as const) {
    const event = await client.organizationProvisioningEvent.findUnique({
      where: { idempotencyKey: idempotencyKey('platform', key) },
      select: { id: true },
    })
    actions.push({
      code: `PLATFORM_${eventType}`,
      recordId: platformOrganization?.id ?? WORKMATCHR_PLATFORM_ORGANIZATION.systemKey,
      outcome: event ? 'ALREADY_CORRECT' : 'WOULD_CREATE',
    })
  }

  const temporaryUser = await client.user.findUnique({
    where: { id: ADR013_PHASE2A.migrationTempUserId },
    select: { migrationClassification: true },
  })
  actions.push({
    code: 'MIGRATION_TEMP_CLASSIFICATION',
    recordId: ADR013_PHASE2A.migrationTempUserId,
    outcome: temporaryUser?.migrationClassification === 'MIGRATION_TEMP' ? 'ALREADY_CORRECT' : 'WOULD_UPDATE',
  })

  for (const userId of ADR013_PHASE2A.existingUserIds) {
    const event = await client.accountProvisioningEvent.findUnique({
      where: { idempotencyKey: idempotencyKey('user-migrated-unknown', userId) },
      select: { id: true },
    })
    actions.push({
      code: 'USER_MIGRATED_UNKNOWN_EVENT',
      recordId: userId,
      outcome: event ? 'ALREADY_CORRECT' : 'WOULD_CREATE',
    })
  }

  return {
    mode: 'dry-run',
    migrationVersion: ADR013_PHASE2A.migrationVersion,
    correlationId: ADR013_PHASE2A.correlationId,
    platformOrganizationId: platformOrganization?.id ?? null,
    actions,
    blockers: [],
  }
}

export async function dryRunAdr013Phase2A(client: PrismaClient, approvedUsers: ApprovedUserRecord[]) {
  return inspectActions(client, approvedUsers)
}

export async function executeAdr013Phase2A(prisma: PrismaClient, approvedUsers: ApprovedUserRecord[]) {
  return prisma.$transaction(
    async (transaction) => {
      await assertApprovedBaseline(transaction, approvedUsers)
      const protectedStateBefore = await protectedStateFingerprint(transaction)
      const actions: Phase2AAction[] = []
      const existingPlatformOrganization = await findPlatformOrganization(transaction)
      const platformOrganization = await ensurePlatformOrganization(transaction)
      actions.push({
        code: 'PLATFORM_ORGANIZATION',
        recordId: platformOrganization.id,
        outcome: existingPlatformOrganization ? 'ALREADY_CORRECT' : 'CREATED',
      })

      const platformEvents = [
        ['ORGANIZATION_BOOTSTRAPPED', 'PLATFORM_ORGANIZATION_BOOTSTRAPPED', 'organization-bootstrapped'],
        ['SYSTEM_IDENTITY_ASSIGNED', 'PLATFORM_SYSTEM_IDENTITY_ASSIGNED', 'system-identity-assigned'],
        ['GOVERNANCE_ACTIVATED', 'PLATFORM_GOVERNANCE_ACTIVATED', 'governance-activated'],
      ] as const
      for (const [eventType, reasonCode, key] of platformEvents) {
        const existing = await transaction.organizationProvisioningEvent.findUnique({
          where: { idempotencyKey: idempotencyKey('platform', key) },
          select: { id: true },
        })
        await appendOrganizationProvisioningEvent(transaction, {
          eventType,
          organizationId: platformOrganization.id,
          actorType: 'SYSTEM',
          actorUserId: null,
          reasonCode,
          correlationId: ADR013_PHASE2A.correlationId,
          idempotencyKey: idempotencyKey('platform', key),
          metadata: { migrationVersion: ADR013_PHASE2A.migrationVersion },
        })
        actions.push({
          code: `PLATFORM_${eventType}`,
          recordId: platformOrganization.id,
          outcome: existing ? 'ALREADY_CORRECT' : 'CREATED',
        })
      }

      for (const userId of ADR013_PHASE2A.existingUserIds) {
        const existing = await transaction.accountProvisioningEvent.findUnique({
          where: { idempotencyKey: idempotencyKey('user-migrated-unknown', userId) },
          select: { id: true },
        })
        await appendAccountProvisioningEvent(transaction, {
          eventType: 'MIGRATED_UNKNOWN',
          subjectUserId: userId,
          actorUserId: null,
          reasonCode: userId === ADR013_PHASE2A.migrationTempUserId
            ? 'ADR013_MIGRATION_TEMP_CLASSIFIED'
            : 'ADR013_LEGACY_PROVISIONER_UNKNOWN',
          correlationId: ADR013_PHASE2A.correlationId,
          idempotencyKey: idempotencyKey('user-migrated-unknown', userId),
          metadata: {
            migrationVersion: ADR013_PHASE2A.migrationVersion,
            provisioningActor: 'UNKNOWN',
            createdByProjection: 'UNCHANGED_NULL',
            ...(userId === ADR013_PHASE2A.migrationTempUserId ? { migrationClassification: 'MIGRATION_TEMP' } : {}),
          },
        })
        actions.push({
          code: 'USER_MIGRATED_UNKNOWN_EVENT',
          recordId: userId,
          outcome: existing ? 'ALREADY_CORRECT' : 'CREATED',
        })
      }

      const temporaryUser = await transaction.user.findUnique({
        where: { id: ADR013_PHASE2A.migrationTempUserId },
        select: { migrationClassification: true },
      })
      if (temporaryUser?.migrationClassification !== 'MIGRATION_TEMP') {
        const updated = await transaction.user.updateMany({
          where: {
            id: ADR013_PHASE2A.migrationTempUserId,
            status: 'INVITED',
            migrationClassification: null,
            createdByUserId: null,
            memberships: { none: {} },
            providerPermissionSubjects: { none: {} },
          },
          data: { migrationClassification: 'MIGRATION_TEMP' },
        })
        if (updated.count !== 1) throw new Adr013Phase2AError('De MIGRATION_TEMP-classificatie kon niet veilig worden toegepast.')
        actions.push({ code: 'MIGRATION_TEMP_CLASSIFICATION', recordId: ADR013_PHASE2A.migrationTempUserId, outcome: 'UPDATED' })
      } else {
        actions.push({ code: 'MIGRATION_TEMP_CLASSIFICATION', recordId: ADR013_PHASE2A.migrationTempUserId, outcome: 'ALREADY_CORRECT' })
      }

      await assertApprovedBaseline(transaction, approvedUsers)
      const platformCount = await transaction.organization.count({
        where: { systemKey: WORKMATCHR_PLATFORM_ORGANIZATION.systemKey, organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE' },
      })
      if (platformCount !== 1) throw new Adr013Phase2AError('De platformorganisatie is na uitvoering niet eenduidig geldig.')
      const protectedStateAfter = await protectedStateFingerprint(transaction)
      if (protectedStateAfter !== protectedStateBefore) {
        throw new Adr013Phase2AError('Een beschermd account-, membership-, auth- of permissionrecord is onverwacht gewijzigd.')
      }

      return {
        mode: 'execute',
        migrationVersion: ADR013_PHASE2A.migrationVersion,
        correlationId: ADR013_PHASE2A.correlationId,
        platformOrganizationId: platformOrganization.id,
        actions,
        blockers: [],
      } satisfies Phase2AReport
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function verifyAdr013Phase2A(client: PrismaClient, approvedUsers: ApprovedUserRecord[]) {
  await assertApprovedBaseline(client, approvedUsers)
  const platformOrganization = await findPlatformOrganization(client)
  if (!platformOrganization) throw new Adr013Phase2AError('De platformorganisatie ontbreekt.')

  const providerProfileCount = await client.providerProfile.count({ where: { organizationId: platformOrganization.id } })
  const intakeCount = await client.intake.count({ where: { clientOrganizationId: platformOrganization.id } })
  const assignmentCount = await client.assignment.count({ where: { clientOrganizationId: platformOrganization.id } })
  const platformMembershipCount = await client.organizationMembership.count({ where: { organizationId: platformOrganization.id } })
  const platformEventCount = await client.organizationProvisioningEvent.count({ where: { organizationId: platformOrganization.id } })
  if (
    providerProfileCount !== 0 ||
    intakeCount !== 0 ||
    assignmentCount !== 0 ||
    platformMembershipCount !== 0 ||
    platformEventCount !== 3
  ) {
    throw new Adr013Phase2AError('De platformorganisatie voldoet niet aan de Fase 2A-invarianten.')
  }

  for (const userId of ADR013_PHASE2A.existingUserIds) {
    const events = await client.accountProvisioningEvent.count({
      where: { subjectUserId: userId, eventType: 'MIGRATED_UNKNOWN' },
    })
    if (events !== 1) throw new Adr013Phase2AError(`User ${userId} heeft niet exact één MIGRATED_UNKNOWN-event.`)
  }

  return {
    platformOrganizationId: platformOrganization.id,
    platformEventCount,
    userProvisioningEventCount: ADR013_PHASE2A.existingUserIds.length,
    migrationTempUserId: ADR013_PHASE2A.migrationTempUserId,
    membershipsUnchanged: true,
    ownersUnchanged: true,
    createdByUserIdsRemainNull: true,
    permissionsGranted: 0,
  }
}
