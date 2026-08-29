import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const sourceConnectionString = process.env.DATABASE_URL
if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('De eligibilitytest mag uitsluitend lokaal draaien.')
}
const databaseName = `workmatchr_eligibility_test_${process.pid}_${Date.now()}`
if (!/^workmatchr_eligibility_test_[0-9_]+$/.test(databaseName)) {
  throw new Error('Ongeldige testdatabasenaam.')
}
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar npm ontbreekt.')

function deploySchema() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    throw new Error(`Migraties in eligibilitytestdatabase mislukt:\n${result.stdout}\n${result.stderr}`)
  }
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma')['getPrisma']>> | null = null
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deploySchema()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    const { publishAssignment } = await import('../src/lib/assignments/assignment-publication-service')
    const { processAssignmentAvailability } = await import('../src/lib/marketplace/assignment-availability-service')
    prisma = getPrisma()

    const taxonomy = await prisma.providerTaxonomy.create({
      data: {
        kind: 'SPECIALISM',
        code: 'TEST_ELIGIBILITY_SPECIALISM',
        name: 'TEST-WM Eligibility specialismen',
        versions: {
          create: {
            version: 1,
            status: 'DRAFT',
            terms: {
              create: [
                { code: 'TEST_ERGONOMICS', label: 'TEST Ergonomie', sortOrder: 1 },
                { code: 'TEST_HYGIENE', label: 'TEST Arbeidshygiëne', sortOrder: 2 },
              ],
            },
          },
        },
      },
      include: { versions: { include: { terms: true } } },
    })
    const specialisms = await Promise.all([
      prisma.specialism.create({
        data: { name: 'TEST Ergonomie', slug: `test-ergonomie-${randomUUID()}` },
      }),
      prisma.specialism.create({
        data: { name: 'TEST Arbeidshygiëne', slug: `test-hygiene-${randomUUID()}` },
      }),
    ])
    await Promise.all(
      taxonomy.versions[0]!.terms.map((term, index) =>
        prisma!.providerSpecialismTaxonomyMap.create({
          data: {
            termId: term.id,
            specialismId: specialisms[index]!.id,
          },
        }),
      ),
    )
    const mappings = await prisma.providerSpecialismTaxonomyMap.findMany({
      take: 2,
      orderBy: { specialismId: 'asc' },
      select: {
        specialismId: true,
        term: { select: { code: true } },
      },
    })
    assert.equal(mappings.length, 2, 'De referentiedata moet minimaal twee specialismen bevatten.')
    const [first, second] = mappings
    const clientOrganization = await prisma.organization.create({
      data: {
        name: 'TEST-WM Eligibility Opdrachtgever',
        organizationType: 'CLIENT',
        status: 'ACTIVE',
      },
    })
    const clientUser = await prisma.user.create({
      data: {
        email: `eligibility-client-${randomUUID()}@example.invalid`,
        status: 'ACTIVE',
        accountType: 'CLIENT',
        emailVerified: true,
        memberships: {
          create: {
            organizationId: clientOrganization.id,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
    })
    const questionnaire = await prisma.intakeQuestionnaire.create({
      data: {
        slug: `test-eligibility-${randomUUID()}`,
        name: 'TEST-WM Eligibility vraagset',
        versions: {
          create: {
            version: 1,
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        },
      },
      include: { versions: true },
    })

    for (let index = 0; index < 20; index += 1) {
      const organization = await prisma.organization.create({
        data: {
          name: `TEST-WM Eligibility Provider ${index + 1}`,
          organizationType: 'PROVIDER',
          status: 'ACTIVE',
        },
      })
      const provider = await prisma.providerProfile.create({
        data: {
          organizationId: organization.id,
          lifecycleStatus: 'QUALIFIED',
          readinessStatus: 'READY',
          platformQualificationStatus: 'QUALIFIED',
          selectabilityStatus: 'SELECTABLE',
        },
      })
      const readiness = await prisma.providerReadinessAssessment.create({
        data: {
          providerProfileId: provider.id,
          status: 'READY',
          reasonCodes: [],
          sourceVersion: 1,
          checksum: randomUUID().replaceAll('-', '').padEnd(64, 'a').slice(0, 64),
        },
      })
      const selectability = await prisma.providerSelectabilityAssessment.create({
        data: {
          providerProfileId: provider.id,
          readinessAssessmentId: readiness.id,
          status: 'SELECTABLE',
          reasonCodes: [],
          sourceVersion: 1,
          checksum: randomUUID().replaceAll('-', '').padEnd(64, 'b').slice(0, 64),
        },
      })
      const capabilities = [
        ...(index < 10 ? [{
          serviceCode: first!.term.code,
          specialismCode: first!.term.code,
          deliveryModes: ['REMOTE'],
        }] : []),
        ...(index < 8 ? [{
          serviceCode: second!.term.code,
          specialismCode: second!.term.code,
          deliveryModes: ['REMOTE'],
        }] : []),
        ...(index >= 10 ? [{
          serviceCode: 'NON_MATCHING_TEST_CAPABILITY',
          specialismCode: null,
          deliveryModes: ['REMOTE'],
        }] : []),
      ]
      await prisma.trustedProviderProjection.create({
        data: {
          providerProfileId: provider.id,
          readinessAssessmentId: readiness.id,
          selectabilityAssessmentId: selectability.id,
          schemaVersion: 2,
          canonicalizationVersion: 'WORKMATCHR-CJ-1',
          sourceVersion: 1,
          payload: {
            capabilities,
            sectors: [],
            workAreas: [{ regionCode: 'NATIONWIDE' }],
          },
          sha256: randomUUID().replaceAll('-', '').padEnd(64, 'c').slice(0, 64),
          validFrom: new Date(Date.now() - 60_000),
          validUntil: new Date(Date.now() + 86_400_000),
        },
      })
    }

    async function publishFor(specialismId: string, additionalSpecialismId?: string) {
      const now = new Date()
      const intake = await prisma!.intake.create({
        data: {
          clientOrganizationId: clientOrganization.id,
          createdByUserId: clientUser.id,
          questionnaireVersionId: questionnaire.versions[0]!.id,
          freeText: 'Fictieve geconverteerde bronintake voor de eligibilitytest.',
          status: 'CONVERTED',
          version: 3,
          submittedAt: now,
          submittedByUserId: clientUser.id,
          convertedAt: now,
        },
      })
      const assignment = await prisma!.assignment.create({
        data: {
          intakeId: intake.id,
          clientOrganizationId: clientOrganization.id,
          createdByUserId: clientUser.id,
          title: 'TEST-WM brede eligibility',
          description: 'Fictieve opdracht waarmee uitsluitend brede marktplaatseligibility wordt getest.',
          status: 'READY_FOR_REVIEW',
          primarySpecialismId: specialismId,
          locationType: 'REMOTE',
          allowsRemoteWork: true,
          maxSelections: 3,
          specialisms: additionalSpecialismId
            ? { create: { specialismId: additionalSpecialismId, isRequired: true } }
            : undefined,
        },
      })
      await publishAssignment(clientUser.id, clientOrganization.id, {
        assignmentId: assignment.id,
        expectedAssignmentVersion: assignment.version,
      })
      return assignment.id
    }

    const tenEligibleAssignmentId = await publishFor(first!.specialismId)
    const firstEvent = await prisma.marketplaceAssignmentAvailability.findUniqueOrThrow({
      where: { assignmentId: tenEligibleAssignmentId },
      include: { matchRun: { include: { candidates: true } } },
    })
    assert.equal(firstEvent.status, 'COMPLETED')
    assert.equal(firstEvent.candidatesEvaluated, 20)
    assert.equal(firstEvent.eligibleCount, 10)
    assert.equal(firstEvent.notEligibleCount, 10)
    assert.equal(firstEvent.matchRun?.candidates.length, 20)
    assert.equal(firstEvent.matchRun?.candidates.filter((item) => item.status === 'ELIGIBLE').length, 10)
    assert.equal(firstEvent.matchRun?.candidates.filter((item) => item.status === 'SELECTED').length, 0)

    await processAssignmentAvailability(tenEligibleAssignmentId)
    assert.equal(await prisma.marketplaceAssignmentAvailability.count({
      where: { assignmentId: tenEligibleAssignmentId },
    }), 1)
    assert.equal(await prisma.marketplaceMatchRun.count({
      where: { assignmentId: tenEligibleAssignmentId },
    }), 1)
    assert.equal(await prisma.marketplaceMatchCandidate.count({
      where: { matchRunId: firstEvent.matchRunId! },
    }), 20)

    const eightEligibleAssignmentId = await publishFor(second!.specialismId)
    const secondEvent = await prisma.marketplaceAssignmentAvailability.findUniqueOrThrow({
      where: { assignmentId: eightEligibleAssignmentId },
    })
    assert.equal(secondEvent.candidatesEvaluated, 20)
    assert.equal(secondEvent.eligibleCount, 8)
    assert.equal(secondEvent.notEligibleCount, 12)

    const multidisciplinaryAssignmentId = await publishFor(
      first!.specialismId,
      second!.specialismId,
    )
    const multidisciplinaryEvent = await prisma.marketplaceAssignmentAvailability.findUniqueOrThrow({
      where: { assignmentId: multidisciplinaryAssignmentId },
      include: { matchRun: { include: { candidates: true } } },
    })
    assert.equal(multidisciplinaryEvent.matchRun?.candidates.length, 20)
    assert.equal(multidisciplinaryEvent.eligibleCount, 10)

    assert.equal(await prisma.providerInvitation.count(), 0)
    assert.equal(await prisma.marketplaceNotification.count(), 0)
    assert.equal(await prisma.notificationOutbox.count(), 0)
    assert.equal(await prisma.providerParticipation.count(), 0)
    assert.equal(await prisma.creditTransaction.count(), 0)
    assert.equal(await prisma.quote.count(), 0)

    await assert.rejects(() => prisma!.marketplaceAssignmentAvailability.create({
      data: {
        assignmentId: tenEligibleAssignmentId,
        publishedVersion: 2,
        flowVersion: 'ASSIGNMENT-ELIGIBILITY-1',
        idempotencyKey: `DUPLICATE:${randomUUID()}`,
      },
    }))

    console.log('Marketplace eligibility-event, brede doelgroep, retry en nul side effects zijn geslaagd.')
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : 'Onbekende eligibilitytestfout.')
  process.exitCode = 1
})
