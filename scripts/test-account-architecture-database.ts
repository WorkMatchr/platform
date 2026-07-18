import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { getPrisma } from '../src/lib/prisma'
import { ensurePlatformOrganization } from '../src/lib/account-architecture/platform-organization-service'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')

const pool = new Pool({ connectionString })

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function databaseCounts(client: PoolClient) {
  const result = await client.query<{ users: string; organizations: string; memberships: string }>(`
    SELECT
      (SELECT count(*)::text FROM "User") AS users,
      (SELECT count(*)::text FROM "Organization") AS organizations,
      (SELECT count(*)::text FROM "OrganizationMembership") AS memberships
  `)
  return result.rows[0]
}

async function begin(client: PoolClient) {
  await client.query('BEGIN')
}

async function rollback(client: PoolClient) {
  await client.query('ROLLBACK')
}

async function expectStatementFailure(client: PoolClient, query: string, values: unknown[], message: string) {
  let failed = false
  try {
    await client.query(query, values)
  } catch {
    failed = true
  }
  assert(failed, message)
}

async function testMultiMembershipAndCreatorRelation(client: PoolClient) {
  await begin(client)
  try {
    const creatorId = randomUUID()
    const userId = randomUUID()
    const firstOrganizationId = randomUUID()
    const secondOrganizationId = randomUUID()
    await client.query(
      `INSERT INTO "User" ("id", "email", "emailVerified", "platformRole", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, false, 'USER', 'INVITED', now(), now())`,
      [creatorId, `creator-${creatorId}@example.invalid`],
    )
    await client.query(
      `INSERT INTO "User" ("id", "email", "emailVerified", "platformRole", "status", "createdByUserId", "createdAt", "updatedAt")
       VALUES ($1, $2, false, 'USER', 'INVITED', $3, now(), now())`,
      [userId, `subject-${userId}@example.invalid`, creatorId],
    )
    for (const organizationId of [firstOrganizationId, secondOrganizationId]) {
      await client.query(
        `INSERT INTO "Organization" ("id", "name", "organizationType", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, 'CLIENT', 'ACTIVE', now(), now())`,
        [organizationId, `TEST-WM-ADR013-${organizationId}`],
      )
      await client.query(
        `INSERT INTO "OrganizationMembership" ("id", "userId", "organizationId", "role", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'OWNER', 'ACTIVE', now(), now())`,
        [randomUUID(), userId, organizationId],
      )
    }
    const memberships = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM "OrganizationMembership" WHERE "userId" = $1`,
      [userId],
    )
    assert(memberships.rows[0]?.count === '2', 'Expand moet twee memberships voor één User tijdelijk toestaan.')

    await client.query(`DELETE FROM "User" WHERE "id" = $1`, [creatorId])
    const creatorProjection = await client.query<{ createdByUserId: string | null }>(
      `SELECT "createdByUserId" FROM "User" WHERE "id" = $1`,
      [userId],
    )
    assert(creatorProjection.rows[0]?.createdByUserId === null, 'Creatorverwijdering moet de projectie op null zetten.')
  } finally {
    await rollback(client)
  }
}

async function testSystemKeyConstraints(client: PoolClient) {
  await begin(client)
  try {
    for (let index = 0; index < 2; index += 1) {
      await client.query(
        `INSERT INTO "Organization" ("id", "name", "organizationType", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, 'CLIENT', 'ACTIVE', now(), now())`,
        [randomUUID(), `TEST-WM-NULL-SYSTEM-KEY-${index}`],
      )
    }
  } finally {
    await rollback(client)
  }

  await begin(client)
  try {
    await client.query(
      `INSERT INTO "Organization" ("id", "name", "organizationType", "status", "systemKey", "createdAt", "updatedAt")
       VALUES ($1, 'TEST-WM-PLATFORM-1', 'PLATFORM_OPERATOR', 'ACTIVE', 'TEST_WM_PLATFORM', now(), now())`,
      [randomUUID()],
    )
    await expectStatementFailure(
      client,
      `INSERT INTO "Organization" ("id", "name", "organizationType", "status", "systemKey", "createdAt", "updatedAt")
       VALUES ($1, 'TEST-WM-PLATFORM-2', 'PLATFORM_OPERATOR', 'ACTIVE', 'TEST_WM_PLATFORM', now(), now())`,
      [randomUUID()],
      'Een ingevulde systemKey moet databasebreed uniek zijn.',
    )
  } finally {
    await rollback(client)
  }
}

async function testAppendOnlyProvisioning(client: PoolClient) {
  await begin(client)
  try {
    const userId = randomUUID()
    const eventId = randomUUID()
    await client.query(
      `INSERT INTO "User" ("id", "email", "emailVerified", "platformRole", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, false, 'USER', 'INVITED', now(), now())`,
      [userId, `history-${userId}@example.invalid`],
    )
    await client.query(
      `INSERT INTO "AccountProvisioningEvent" ("id", "eventType", "subjectUserId", "reasonCode", "idempotencyKey")
       VALUES ($1, 'MIGRATED_UNKNOWN', $2, 'LEGACY_ACTOR_UNKNOWN', $3)`,
      [eventId, userId, `test:${eventId}`],
    )
    await expectStatementFailure(
      client,
      `UPDATE "AccountProvisioningEvent" SET "reasonCode" = 'CHANGED' WHERE "id" = $1`,
      [eventId],
      'Provisioningevents moeten databasebreed append-only zijn.',
    )
  } finally {
    await rollback(client)
  }

  await begin(client)
  try {
    const userId = randomUUID()
    const organizationId = randomUUID()
    const membershipId = randomUUID()
    const eventId = randomUUID()
    await client.query(
      `INSERT INTO "User" ("id", "email", "emailVerified", "platformRole", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, false, 'USER', 'INVITED', now(), now())`,
      [userId, `membership-history-${userId}@example.invalid`],
    )
    await client.query(
      `INSERT INTO "Organization" ("id", "name", "organizationType", "status", "createdAt", "updatedAt")
       VALUES ($1, 'TEST-WM-MEMBERSHIP-HISTORY', 'CLIENT', 'ACTIVE', now(), now())`,
      [organizationId],
    )
    await client.query(
      `INSERT INTO "OrganizationMembership" ("id", "userId", "organizationId", "role", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'OWNER', 'ACTIVE', now(), now())`,
      [membershipId, userId, organizationId],
    )
    await client.query(
      `INSERT INTO "OrganizationMembershipEvent" ("id", "eventType", "membershipId", "userId", "organizationId", "reasonCode")
       VALUES ($1, 'MEMBERSHIP_CREATED', $2, $3, $4, 'TEST_CREATED')`,
      [eventId, membershipId, userId, organizationId],
    )
    await expectStatementFailure(
      client,
      `DELETE FROM "OrganizationMembershipEvent" WHERE "id" = $1`,
      [eventId],
      'Membershipevents moeten databasebreed append-only zijn.',
    )
  } finally {
    await rollback(client)
  }
}

async function testHistoricalActorRestriction(client: PoolClient) {
  await begin(client)
  try {
    const actorId = randomUUID()
    const subjectId = randomUUID()
    for (const userId of [actorId, subjectId]) {
      await client.query(
        `INSERT INTO "User" ("id", "email", "emailVerified", "platformRole", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, false, 'USER', 'INVITED', now(), now())`,
        [userId, `actor-${userId}@example.invalid`],
      )
    }
    await client.query(
      `INSERT INTO "AccountProvisioningEvent" ("eventType", "subjectUserId", "actorUserId", "reasonCode")
       VALUES ('ACCOUNT_CREATED', $1, $2, 'TEST_ACTOR')`,
      [subjectId, actorId],
    )
    await expectStatementFailure(
      client,
      `DELETE FROM "User" WHERE "id" = $1`,
      [actorId],
      'Een historische provisioningactor moet door RESTRICT behouden blijven.',
    )
  } finally {
    await rollback(client)
  }
}

async function testAppendOnlyOrganizationProvisioning(client: PoolClient) {
  await begin(client)
  try {
    const organizationId = randomUUID()
    const eventId = randomUUID()
    const idempotencyKey = `test:${eventId}`
    await client.query(
      `INSERT INTO "Organization" ("id", "name", "organizationType", "status", "systemKey", "createdAt", "updatedAt")
       VALUES ($1, 'TEST-WM-PLATFORM-HISTORY', 'PLATFORM_OPERATOR', 'ACTIVE', $2, now(), now())`,
      [organizationId, `TEST_WM_PLATFORM_${organizationId.replaceAll('-', '').toUpperCase()}`],
    )
    await client.query(
      `INSERT INTO "OrganizationProvisioningEvent"
         ("id", "eventType", "organizationId", "actorType", "actorUserId", "reasonCode", "idempotencyKey")
       VALUES ($1, 'ORGANIZATION_BOOTSTRAPPED', $2, 'SYSTEM', NULL, 'TEST_BOOTSTRAP', $3)`,
      [eventId, organizationId, idempotencyKey],
    )
    await expectStatementFailure(
      client,
      `UPDATE "OrganizationProvisioningEvent" SET "reasonCode" = 'CHANGED' WHERE "id" = $1`,
      [eventId],
      'Organisatieprovisioningevents moeten databasebreed append-only zijn.',
    )
  } finally {
    await rollback(client)
  }

  await begin(client)
  try {
    const organizationId = randomUUID()
    await client.query(
      `INSERT INTO "Organization" ("id", "name", "organizationType", "status", "systemKey", "createdAt", "updatedAt")
       VALUES ($1, 'TEST-WM-PLATFORM-ACTOR', 'PLATFORM_OPERATOR', 'ACTIVE', $2, now(), now())`,
      [organizationId, `TEST_WM_PLATFORM_${organizationId.replaceAll('-', '').toUpperCase()}`],
    )
    await expectStatementFailure(
      client,
      `INSERT INTO "OrganizationProvisioningEvent"
         ("eventType", "organizationId", "actorType", "actorUserId", "reasonCode", "idempotencyKey")
       VALUES ('GOVERNANCE_ACTIVATED', $1, 'USER', NULL, 'TEST_INVALID_ACTOR', $2)`,
      [organizationId, `test:invalid-actor:${organizationId}`],
      'Een USER-actor zonder actorUserId moet databasebreed worden geweigerd.',
    )
  } finally {
    await rollback(client)
  }
}

async function testRetentionIsolation(client: PoolClient) {
  const foreignKeys = await client.query<{ foreign_table: string }>(`
    SELECT ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'DeletedAccountRetention'
  `)
  assert(
    foreignKeys.rows.length === 1 && foreignKeys.rows[0]?.foreign_table === 'User',
    'Het retentiemodel mag uitsluitend de blijvende auditidentiteit refereren.',
  )
}

async function testPlatformBootstrap() {
  const rollbackMarker = new Error('ROLLBACK_PLATFORM_BOOTSTRAP_TEST')
  try {
    await getPrisma().$transaction(async (transaction) => {
      const first = await ensurePlatformOrganization(transaction)
      const second = await ensurePlatformOrganization(transaction)
      assert(first.id === second.id, 'De platformorganisatiebootstrap moet idempotent zijn.')
      throw rollbackMarker
    })
  } catch (error) {
    if (error !== rollbackMarker) throw error
  }
}

async function main() {
  const client = await pool.connect()
  try {
    const before = await databaseCounts(client)
    await testMultiMembershipAndCreatorRelation(client)
    await testSystemKeyConstraints(client)
    await testAppendOnlyProvisioning(client)
    await testHistoricalActorRestriction(client)
    await testAppendOnlyOrganizationProvisioning(client)
    await testRetentionIsolation(client)
    await testPlatformBootstrap()
    const after = await databaseCounts(client)
    assert(JSON.stringify(after) === JSON.stringify(before), 'De integriteitstest heeft databasegegevens achtergelaten.')
    console.log('ADR-013 Expand database-integriteit gecontroleerd; alle tijdelijke transacties zijn teruggedraaid.')
  } finally {
    client.release()
    await pool.end()
    await getPrisma().$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'ADR-013 database-integriteitstest is mislukt.')
  process.exitCode = 1
})
