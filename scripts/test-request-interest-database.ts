import 'dotenv/config'
import { seedHistoricalRequest, seedHistoricalParticipants } from './fixtures/historical-request'
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
    await (await import('./fixtures/reviewed-marketplace-provider')).reviewSelectableRequestFixtures(prisma)
    const reviewedAt = Date.now()
    const scenarioTime = (minutes: number) => new Date(reviewedAt + minutes * 60_000)
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
        completedAt: scenarioTime(-2940),
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
    await expectCode(() => requestService.publishRequest({
      viewer,
      publication: {
        adviceDossierId: dossier.id,
        publicSummary:
          'Wij zoeken ondersteuning bij een actuele risico-inventarisatie voor onze organisatie.',
        requestedStart: 'IN_CONSULTATION',
        notes: '',
      },
      at: scenarioTime(0),
    }), 'CANONICAL_REQUEST_REQUIRED')
    assert.equal(await prisma.request.count(), 0)
    assert.equal(await prisma.requestEligibleProvider.count(), 0)
    const request = await seedHistoricalRequest(prisma, dossier.id, viewer.organizationId, scenarioTime(0))
    const [actor, other] = await seedHistoricalParticipants(prisma, request.id, 2)
    const input = { actor: actor!, requestId: request.id }
    const list = await interestService.listEligibleRequestsForProvider(actor!)
    assert.deepEqual(list.map(item => item.request.id), [request.id])
    assert.ok(!JSON.stringify(list).includes('generalEmail'))
    const detail = await interestService.getEligibleRequestForProvider(actor!, request.id)
    assert.equal(detail.requesterDetails, null)
    await expectCode(() => interestService.getEligibleRequestForProvider({ ...actor!, organizationId: other!.organizationId }, request.id), 'ACCESS_DENIED')
    const before = await prisma.requestInterestEvent.count()
    await Promise.all(Array.from({ length: 4 }, () => expectCode(() => interestService.registerRequestInterest(input), 'LEGACY_ROUTE_CLOSED')))
    assert.equal(await prisma.requestInterest.count(), 2)
    assert.equal(await prisma.requestInterestEvent.count(), before)
    await Promise.all([interestService.withdrawRequestInterest(input), interestService.withdrawRequestInterest(input)])
    assert.equal(await prisma.requestInterestEvent.count(), before + 1)
    await expectCode(() => interestService.registerRequestInterest(input), 'LEGACY_ROUTE_CLOSED')
    assert.equal((await interestService.getEligibleRequestForProvider(actor!, request.id)).interest?.status, 'WITHDRAWN')
    assert.equal(await prisma.providerInvitation.count(), 0)
    assert.equal(await prisma.creditTransaction.count(), 0)
    console.log('Oude publicatie, registratie en heractivering geweigerd. Archief, tenantisolatie en eenmalige intrekkingsaudit bevestigd.')
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
