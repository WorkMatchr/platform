import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error(
    'De interesse-integratietest mag uitsluitend tegen lokale PostgreSQL draaien.',
  )
}
const databaseName = `workmatchr_test_providers_m7d2_${process.pid}_${Date.now()}`
const targetUrl = new URL(sourceUrl)
targetUrl.pathname = `/${databaseName}`
targetUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar de npm-CLI ontbreekt.')

function runDataset(command: 'seed' | 'remove') {
  const script =
    command === 'seed'
      ? 'seed:test-providers'
      : 'seed:test-providers:remove'
  return spawnSync(process.execPath, [npmExecPath!, 'run', script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      WORKMATCHR_TEST_PROVIDER_DATABASE: databaseName,
    },
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

async function expectCode(
  action: () => Promise<unknown>,
  expected: string,
) {
  let code: string | undefined
  try {
    await action()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      code = String(error.code)
    }
  }
  assert.equal(code, expected)
}

async function main() {
  const seeded = runDataset('seed')
  if (seeded.status !== 0) {
    throw new Error(
      `M7X.1-seed mislukt:\n${seeded.stdout}\n${seeded.stderr}`,
    )
  }
  process.env.DATABASE_URL = targetUrl.toString()
  const { getPrisma } = await import('../src/lib/prisma')
  const requestService = await import(
    '../src/lib/requests/request-service'
  )
  const interestService = await import(
    '../src/lib/requests/request-interest-service'
  )
  const prisma = getPrisma()

  try {
    const clientMembership =
      await prisma.organizationMembership.findFirstOrThrow({
        where: {
          role: 'OWNER',
          status: 'ACTIVE',
          organization: {
            organizationType: 'CLIENT',
            name: { startsWith: 'TEST-WM-' },
          },
        },
        select: {
          userId: true,
          organizationId: true,
        },
      })
    const dossier = await prisma.adviceDossier.create({
      data: {
        dossierCode: 'WM-2026-720001',
        ownerUserId: clientMembership.userId,
        organizationId: clientMembership.organizationId,
        sourceRoute: 'KNOWLEDGE',
        subject: 'Risico-inventarisatie en -evaluatie',
        status: 'COMPLETED',
        currentVersionNumber: 1,
        completedAt: new Date('2026-07-30T08:00:00Z'),
      },
    })
    await prisma.adviceDossierVersion.create({
      data: {
        adviceDossierId: dossier.id,
        versionNumber: 1,
        originalHelpRequest:
          'Wij willen onze risico-inventarisatie laten beoordelen.',
        situationSummary:
          'U wilt weten welke ondersteuning past bij een actuele RI&E.',
        subject: 'Risico-inventarisatie en -evaluatie',
        adviceTitle: 'Breng risico’s systematisch in kaart',
        adviceBody: 'Een deskundige kan de inventarisatie ondersteunen.',
        adviceReasons: ['Een actuele beoordeling ondersteunt preventie.'],
        selfActions: ['Verzamel werkzaamheden en bestaande maatregelen.'],
        primaryProfessionalRequirementSnapshot: {
          label: 'Middelbaar Veiligheidskundige (MVK)',
          priority: 'PRIMARY',
          reason: 'Ondersteuning bij de RI&E.',
          expertise: ['RI&E', 'Risicobeoordeling'],
          capabilityCodes: ['RISK_ASSESSMENT'],
        },
        additionalProfessionalRequirementsSnapshot: [
          {
            label: 'Veiligheidskundige',
            priority: 'ADDITIONAL',
            reason: 'Aanvullend veiligheidsadvies.',
            expertise: ['Veiligheidsadvies'],
            capabilityCodes: ['SAFETY_ADVICE'],
          },
        ],
        knowledgeReferencesSnapshot: [],
        sourceReferencesSnapshot: [],
        uncertaintiesSnapshot: [],
        disclaimer:
          'Dit advies ondersteunt uw afweging en vervangt geen professionele beoordeling of juridisch advies.',
        outcomeSpecificity: 'SPECIFIC',
        completionStatus: 'COMPLETED_WITH_GUIDANCE',
      },
    })
    const viewer = {
      userId: clientMembership.userId,
      organizationId: clientMembership.organizationId,
      organizationRole: 'OWNER' as const,
    }
    const request = await requestService.publishRequest({
      viewer,
      publication: {
        adviceDossierId: dossier.id,
        publicSummary:
          'Wij zoeken ondersteuning bij een actuele risico-inventarisatie voor onze organisatie.',
        requestedStart: 'IN_CONSULTATION',
        notes: '',
      },
      at: new Date('2026-07-30T09:00:00Z'),
    })
    const eligible =
      await prisma.requestEligibleProvider.findMany({
        where: { requestId: request.id },
        include: {
          providerOrganization: {
            include: {
              memberships: {
                where: { status: 'ACTIVE' },
                take: 1,
              },
            },
          },
          providerProfile: true,
        },
      })
    const publishedRequest = await prisma.request.findUniqueOrThrow({
      where: { id: request.id },
      select: { regionCode: true },
    })
    assert.ok(publishedRequest.regionCode)
    assert.ok(eligible.length > 1)
    assert.ok(eligible.length < 50)
    assert.ok(
      eligible.every(
        (item) =>
          item.providerProfile.readinessStatus === 'READY' &&
          item.providerProfile.selectabilityStatus === 'SELECTABLE',
      ),
    )
    for (const item of eligible) {
      const projection =
        await prisma.trustedProviderProjection.findUniqueOrThrow({
          where: { id: item.projectionId },
          select: { payload: true },
        })
      const payload = projection.payload as {
        workAreas?: Array<{ regionCode: string }>
      }
      assert.ok(
        payload.workAreas?.some((area) =>
          [
            publishedRequest.regionCode!,
            'NATIONWIDE',
          ].includes(area.regionCode),
        ),
      )
    }
    assert.ok(
      eligible.some((item) =>
        item.matchedExpertise.some((value) =>
          value.startsWith('PRIMARY:'),
        ),
      ),
    )
    assert.ok(
      eligible.some((item) =>
        item.matchedExpertise.some((value) =>
          value.startsWith('ADDITIONAL:'),
        ),
      ),
    )

    const selected = eligible[0]!
    const providerOwnerId =
      selected.providerOrganization.memberships[0]!.userId
    const actor = {
      userId: providerOwnerId,
      organizationId: selected.providerOrganizationId,
    }
    const list =
      await interestService.listEligibleRequestsForProvider(actor)
    assert.equal(list.length, 1)
    const serializedList = JSON.stringify(list)
    assert.equal(serializedList.includes('contactEmail'), false)
    assert.equal(serializedList.includes('generalEmail'), false)
    assert.equal(serializedList.includes('ownerUser'), false)
    assert.equal(serializedList.includes('adviceDossier'), false)
    assert.equal(serializedList.includes('notes'), false)

    const nonEligible =
      await prisma.organization.findFirstOrThrow({
        where: {
          organizationType: { in: ['PROVIDER', 'BOTH'] },
          name: { startsWith: 'TEST-WM-' },
          eligibleProviderRequests: {
            none: { requestId: request.id },
          },
        },
        select: {
          id: true,
          memberships: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: { userId: true },
          },
        },
      })
    await expectCode(
      () =>
        interestService.getEligibleRequestForProvider(
          {
            userId: nonEligible.memberships[0]!.userId,
            organizationId: nonEligible.id,
          },
          request.id,
        ),
      'NOT_FOUND',
    )

    const member = await prisma.user.create({
      data: {
        email: 'm7d2-member@example.invalid',
        displayName: 'M7D.2 lid',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: member.id,
        organizationId: selected.providerOrganizationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    })
    const memberDetail =
      await interestService.getEligibleRequestForProvider(
        {
          userId: member.id,
          organizationId: selected.providerOrganizationId,
        },
        request.id,
      )
    assert.equal(memberDetail.canManage, false)
    await expectCode(
      () =>
        interestService.registerRequestInterest({
          actor: {
            userId: member.id,
            organizationId: selected.providerOrganizationId,
          },
          requestId: request.id,
        }),
      'ACCESS_DENIED',
    )

    const race = await Promise.all(
      Array.from({ length: 8 }, () =>
        interestService.registerRequestInterest({
          actor,
          requestId: request.id,
          at: new Date('2026-07-30T09:15:00Z'),
        }),
      ),
    )
    assert.equal(new Set(race.map((item) => item.id)).size, 1)
    assert.equal(
      await prisma.requestInterest.count({
        where: {
          requestId: request.id,
          providerOrganizationId: actor.organizationId,
        },
      }),
      1,
    )
    let interest = await prisma.requestInterest.findFirstOrThrow({
      where: {
        requestId: request.id,
        providerOrganizationId: actor.organizationId,
      },
      include: { events: true },
    })
    assert.equal(interest.events.length, 1)
    assert.equal(interest.status, 'INTERESTED')

    await interestService.withdrawRequestInterest({
      actor,
      requestId: request.id,
      at: new Date('2026-07-30T09:20:00Z'),
    })
    await interestService.registerRequestInterest({
      actor,
      requestId: request.id,
      at: new Date('2026-07-30T09:25:00Z'),
    })
    interest = await prisma.requestInterest.findFirstOrThrow({
      where: { id: interest.id },
      include: { events: { orderBy: { occurredAt: 'asc' } } },
    })
    assert.equal(interest.status, 'INTERESTED')
    assert.equal(interest.withdrawnAt, null)
    assert.deepEqual(
      interest.events.map((event) => event.type),
      [
        'INTEREST_REGISTERED',
        'INTEREST_WITHDRAWN',
        'INTEREST_REACTIVATED',
      ],
    )
    await assert.rejects(
      prisma.requestInterestEvent.delete({
        where: { id: interest.events[0]!.id },
      }),
    )
    await assert.rejects(
      prisma.requestEligibleProvider.update({
        where: { id: selected.id },
        data: { matchedExpertise: ['PRIMARY:Gewijzigd'] },
      }),
    )

    const initialEligibilityCount = eligible.length
    await prisma.providerProfile.update({
      where: { id: selected.providerProfileId },
      data: { selectabilityStatus: 'NOT_SELECTABLE' },
    })
    assert.equal(
      await prisma.requestEligibleProvider.count({
        where: { requestId: request.id },
      }),
      initialEligibilityCount,
    )

    const ownRequest = await requestService.getOwnRequest(
      viewer,
      request.id,
    )
    assert.equal(
      ownRequest._count.eligibleProviders,
      initialEligibilityCount,
    )
    assert.equal(ownRequest._count.interests, 1)

    await interestService.withdrawRequestInterest({
      actor,
      requestId: request.id,
      at: new Date('2026-07-30T09:30:00Z'),
    })
    await prisma.request.update({
      where: { id: request.id },
      data: {
        status: 'CANCELLED',
        archivedAt: new Date('2026-07-30T09:31:00Z'),
      },
    })
    await expectCode(
      () =>
        interestService.registerRequestInterest({
          actor,
          requestId: request.id,
        }),
      'INVALID_STATUS',
    )

    assert.equal(await prisma.providerInvitation.count(), 0)
    assert.equal(await prisma.providerParticipation.count(), 0)
    assert.equal(await prisma.quote.count(), 0)
    assert.equal(await prisma.creditTransaction.count(), 0)
    assert.equal(await prisma.marketplaceMatchRun.count(), 0)

    console.log(
      `M7D.2-integriteit: ${initialEligibilityCount} immutable eligible organisaties, concurrency, privacy, intrekken, heractiveren en tenantisolatie geslaagd.`,
    )
  } finally {
    await prisma.$disconnect()
    const removed = runDataset('remove')
    if (removed.status !== 0) {
      throw new Error(
        `Tijdelijke M7D.2-database kon niet worden verwijderd:\n${removed.stdout}\n${removed.stderr}`,
      )
    }
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
