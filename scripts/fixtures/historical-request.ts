import assert from 'node:assert/strict'
import type { PrismaClient } from '../../src/generated/prisma/client'

// Reconstruct pre-retirement rows only in disposable local integration databases.
export async function seedHistoricalRequest(db: PrismaClient, dossierId: string, organizationId: string, at: Date) {
  const url = new URL(process.env.DATABASE_URL!)
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  const [{ name }] = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  assert.match(name, /^workmatchr_test_providers_m7d[23]_\d+_\d+$/)
  assert.equal(url.pathname, '/' + name)
  return db.request.create({ data: {
    tenantId: organizationId, organizationId, adviceDossierId: dossierId,
    requestNumber: 'WM-R-2026-720001', status: 'PUBLISHED', publishedAt: at,
    title: 'Historische RI&E-aanvraag', publicSummary: 'Synthetische oude aanvraag voor de archieftest.',
    requestedStart: 'IN_CONSULTATION',
  } })
}

export async function seedHistoricalParticipants(db: PrismaClient, requestId: string, count: number) {
  const profiles = await db.providerProfile.findMany({
    where: { selectabilityStatus: 'SELECTABLE', organization: { name: { startsWith: 'TEST-WM-' } } },
    take: count, orderBy: { id: 'asc' }, include: {
      trustedProjections: { take: 1, orderBy: { sourceVersion: 'desc' } },
      organization: { include: { memberships: { where: { role: 'OWNER', status: 'ACTIVE' }, take: 1 } } },
    },
  })
  assert.equal(profiles.length, count)
  const result = []
  for (const profile of profiles) {
    const organizationId = profile.organizationId
    const userId = profile.organization.memberships[0]!.userId
    await db.requestEligibleProvider.create({ data: { requestId, providerProfileId: profile.id,
      providerOrganizationId: organizationId, projectionId: profile.trustedProjections[0]!.id,
      matchedExpertise: ['PRIMARY:RI&E'], eligibilityBasis: { fixture: 'historical' },
    } })
    const interest = await db.requestInterest.create({ data: { requestId, providerOrganizationId: organizationId, createdByUserId: userId } })
    await db.requestInterestEvent.create({ data: { interestId: interest.id, requestId, providerOrganizationId: organizationId,
      actorUserId: userId, type: 'INTEREST_REGISTERED', toStatus: 'INTERESTED', idempotencyKey: 'history:' + interest.id } })
    result.push({ userId, organizationId, interestId: interest.id })
  }
  return result
}
