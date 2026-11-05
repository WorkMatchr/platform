import { Prisma, type PrismaClient } from '@/generated/prisma/client'
import {
  appendAccountProvisioningEvent,
  appendOrganizationMembershipEvent,
  appendOrganizationProvisioningEvent,
} from './account-history-service'
import { ensurePlatformOrganization, findPlatformOrganization } from './platform-organization-service'
import { assertFirstPlatformOwnerBootstrapEnvironment, assertFirstPlatformOwnerDatabaseIdentity } from './first-platform-owner-bootstrap-policy'

const POLICY_VERSION = 'FIRST_PLATFORM_OWNER_BOOTSTRAP_V1'
const CORRELATION_ID = 'WORKMATCHR_FIRST_PLATFORM_OWNER_BOOTSTRAP_V1'
const MEMBERSHIP_EVENT_KEY = 'workmatchr:first-platform-owner:v1:membership'
const ACCOUNT_EVENT_KEY = 'workmatchr:first-platform-owner:v1:account-role'
const PLATFORM_EVENT_KEYS = {
  bootstrapped: 'adr013:phase2a:v1:platform:organization-bootstrapped',
  systemIdentity: 'adr013:phase2a:v1:platform:system-identity-assigned',
  governance: 'adr013:phase2a:v1:platform:governance-activated',
} as const

// A transaction-scoped advisory lock serializes the first-owner decision even
// before the platform Organization row exists.
const ADVISORY_LOCK_NAMESPACE = 1_431_524_691
const ADVISORY_LOCK_KEY = 1

export class FirstPlatformOwnerBootstrapError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_INPUT'
      | 'OWNER_ALREADY_EXISTS'
      | 'BOOTSTRAP_ALREADY_USED'
      | 'IDENTITY_NOT_ELIGIBLE'
      | 'CONFLICT',
    message: string,
  ) {
    super(message)
    this.name = 'FirstPlatformOwnerBootstrapError'
  }
}

export type FirstPlatformOwnerBootstrapReport = {
  mode: 'dry-run' | 'execute'
  userId: string
  operatorReference: string
  platformOrganization: 'EXISTS' | 'WOULD_CREATE' | 'CREATED'
  eligibleIdentity: boolean
  existingOwnerCount: number
  bootstrapAlreadyUsed: boolean
  actions: string[]
  blockers: string[]
}

function validateInput(userId: string, operatorReference: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
    !/^[A-Za-z0-9][A-Za-z0-9:_-]{5,119}$/.test(operatorReference)
  ) {
    throw new FirstPlatformOwnerBootstrapError(
      'INVALID_INPUT',
      'Geef een geldig User-ID en een niet-persoonlijke operator-/besluitreferentie op.',
    )
  }
}

async function getExistingOwnerCount(client: PrismaClient | Prisma.TransactionClient, organizationId: string) {
  return client.organizationMembership.count({
    where: { organizationId, role: 'OWNER' },
  })
}

async function isEligibleIdentity(client: PrismaClient | Prisma.TransactionClient, userId: string) {
  const user = await client.user.findFirst({
    where: {
      id: userId,
      status: 'ACTIVE',
      emailVerified: true,
      OR: [
        { email: { endsWith: '@example.invalid', mode: 'insensitive' } },
        { email: { endsWith: '.example.invalid', mode: 'insensitive' } },
      ],
      platformRole: 'USER',
      migrationClassification: null,
      displayName: { not: null },
      memberships: { none: {} },
      accounts: { some: { providerId: 'credential', password: { not: null } } },
    },
    select: { id: true },
  })
  return Boolean(user)
}

async function isBootstrapAlreadyUsed(client: PrismaClient | Prisma.TransactionClient) {
  const event = await client.organizationMembershipEvent.findUnique({
    where: { idempotencyKey: MEMBERSHIP_EVENT_KEY },
    select: { id: true },
  })
  return Boolean(event)
}

export async function inspectFirstPlatformOwnerBootstrap(
  prisma: PrismaClient,
  input: { userId: string; operatorReference: string },
): Promise<FirstPlatformOwnerBootstrapReport> {
  assertFirstPlatformOwnerBootstrapEnvironment()
  validateInput(input.userId, input.operatorReference)
  await assertDatabaseIdentity(prisma)
  const organization = await findPlatformOrganization(prisma)
  const ownerCount = organization ? await getExistingOwnerCount(prisma, organization.id) : 0
  const bootstrapAlreadyUsed = await isBootstrapAlreadyUsed(prisma)
  const eligibleIdentity = await isEligibleIdentity(prisma, input.userId)
  const blockers: string[] = []
  if (ownerCount > 0) blockers.push('Er bestaat al een platformmembership met rol OWNER.')
  if (bootstrapAlreadyUsed) blockers.push('De eenmalige first-owner-bootstrap is al gebruikt.')
  if (!eligibleIdentity) blockers.push('De aangewezen persoon heeft geen actief, geverifieerd Better Auth-testaccount onder example.invalid zonder membership.')

  return {
    mode: 'dry-run',
    userId: input.userId,
    operatorReference: input.operatorReference,
    platformOrganization: organization ? 'EXISTS' : 'WOULD_CREATE',
    eligibleIdentity,
    existingOwnerCount: ownerCount,
    bootstrapAlreadyUsed,
    actions: blockers.length ? [] : [
      ...(organization ? [] : ['Maak de centrale WORKMATCHR_PLATFORM-organisatie aan.']),
      'Ken één actieve OWNER-membership toe aan het geverifieerde account.',
      'Zet de platformrol op ADMIN en trek bestaande sessies in zodat opnieuw inloggen nodig is.',
      'Schrijf append-only account-, membership- en organisatieprovisioningevents.',
    ],
    blockers,
  }
}

export async function executeFirstPlatformOwnerBootstrap(
  prisma: PrismaClient,
  input: { userId: string; operatorReference: string },
): Promise<FirstPlatformOwnerBootstrapReport> {
  assertFirstPlatformOwnerBootstrapEnvironment()
  validateInput(input.userId, input.operatorReference)
  await assertDatabaseIdentity(prisma)
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_NAMESPACE}, ${ADVISORY_LOCK_KEY})::text
    `)
    await transaction.$queryRaw(Prisma.sql`
      SELECT "id" FROM "User" WHERE "id" = ${input.userId}::uuid FOR UPDATE
    `)

    if (await isBootstrapAlreadyUsed(transaction)) {
      throw new FirstPlatformOwnerBootstrapError(
        'BOOTSTRAP_ALREADY_USED',
        'De first-owner-bootstrap is al eerder uitgevoerd; herstel verloopt via een afzonderlijk besluit.',
      )
    }

    const existingOrganization = await findPlatformOrganization(transaction)
    if (existingOrganization && await getExistingOwnerCount(transaction, existingOrganization.id) > 0) {
      throw new FirstPlatformOwnerBootstrapError(
        'OWNER_ALREADY_EXISTS',
        'Er bestaat al een platformeigenaar; de first-owner-bootstrap is geweigerd.',
      )
    }
    if (!await isEligibleIdentity(transaction, input.userId)) {
      throw new FirstPlatformOwnerBootstrapError(
        'IDENTITY_NOT_ELIGIBLE',
      'De aangewezen persoon moet zichzelf eerst met een example.invalid-testadres via Better Auth registreren en verifiëren.',
      )
    }

    const platformOrganization = existingOrganization ?? await ensurePlatformOrganization(transaction)
    const organizationEventMetadata = {
      policyVersion: POLICY_VERSION,
      operatorReference: input.operatorReference,
    }
    const organizationEvents = [
      ['ORGANIZATION_BOOTSTRAPPED', 'PLATFORM_ORGANIZATION_BOOTSTRAPPED', PLATFORM_EVENT_KEYS.bootstrapped],
      ['SYSTEM_IDENTITY_ASSIGNED', 'PLATFORM_SYSTEM_IDENTITY_ASSIGNED', PLATFORM_EVENT_KEYS.systemIdentity],
      ['GOVERNANCE_ACTIVATED', 'PLATFORM_GOVERNANCE_ACTIVATED', PLATFORM_EVENT_KEYS.governance],
    ] as const
    for (const [eventType, reasonCode, idempotencyKey] of organizationEvents) {
      await appendOrganizationProvisioningEvent(transaction, {
        eventType,
        organizationId: platformOrganization.id,
        actorType: 'SYSTEM',
        actorUserId: null,
        reasonCode,
        correlationId: 'ADR013_PHASE2A_PLATFORM_PROVISIONING_V1',
        idempotencyKey,
        metadata: organizationEventMetadata,
      })
    }

    const membership = await transaction.organizationMembership.create({
      data: {
        userId: input.userId,
        organizationId: platformOrganization.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
      select: { id: true },
    })
    const promoted = await transaction.user.updateMany({
      where: {
        id: input.userId,
        status: 'ACTIVE',
        emailVerified: true,
        platformRole: 'USER',
        migrationClassification: null,
      },
      data: { platformRole: 'ADMIN' },
    })
    if (promoted.count !== 1) {
      throw new FirstPlatformOwnerBootstrapError('CONFLICT', 'De accountstatus veranderde gelijktijdig; er is niets toegepast.')
    }

    await transaction.session.deleteMany({ where: { userId: input.userId } })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_CREATED',
      membershipId: membership.id,
      userId: input.userId,
      organizationId: platformOrganization.id,
      previousRole: null,
      newRole: 'OWNER',
      previousStatus: null,
      newStatus: 'ACTIVE',
      reasonCode: 'FIRST_PLATFORM_OWNER_BOOTSTRAPPED',
      correlationId: CORRELATION_ID,
      idempotencyKey: MEMBERSHIP_EVENT_KEY,
      metadata: { policyVersion: POLICY_VERSION, operatorReference: input.operatorReference },
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ROLE_GRANTED',
      subjectUserId: input.userId,
      organizationId: platformOrganization.id,
      membershipId: membership.id,
      reasonCode: 'FIRST_PLATFORM_OWNER_BOOTSTRAPPED',
      correlationId: CORRELATION_ID,
      idempotencyKey: ACCOUNT_EVENT_KEY,
      metadata: { policyVersion: POLICY_VERSION, operatorReference: input.operatorReference, platformRole: 'ADMIN' },
    })

    return {
      mode: 'execute',
      userId: input.userId,
      operatorReference: input.operatorReference,
      platformOrganization: existingOrganization ? 'EXISTS' : 'CREATED',
      eligibleIdentity: true,
      existingOwnerCount: 0,
      bootstrapAlreadyUsed: false,
      actions: ['Eerste platformeigenaar is toegewezen; bestaande sessies zijn ingetrokken.'],
      blockers: [],
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 })
}

async function assertDatabaseIdentity(prisma: PrismaClient) {
  const identity = await prisma.$queryRaw<Array<{ databaseName: string; serverVersionNum: number }>>`
    SELECT current_database() AS "databaseName",
      current_setting('server_version_num')::integer AS "serverVersionNum"
  `
  assertFirstPlatformOwnerDatabaseIdentity(identity[0])
}
