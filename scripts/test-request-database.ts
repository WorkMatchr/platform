import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is niet geconfigureerd.')
}
const sourceUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error(
    'De aanvraagpublicatietest mag uitsluitend tegen lokale PostgreSQL draaien.',
  )
}

const databaseName = `workmatchr_request_test_${process.pid}_${Date.now()}`
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar de npm-CLI ontbreekt.')

function deployAndSeed() {
  for (const script of ['db:deploy', 'db:seed'] as const) {
    const result = spawnSync(
      process.execPath,
      [npmExecPath!, 'run', script],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: testUrl.toString() },
        encoding: 'utf8',
        stdio: 'pipe',
      },
    )
    if (result.status !== 0) {
      throw new Error(
        `${script} mislukt:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
      )
    }
  }
}

async function expectRequestError(
  action: () => Promise<unknown>,
  expectedCode: string,
) {
  let actualCode: string | undefined
  try {
    await action()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      actualCode = String(error.code)
    }
  }
  assert.equal(actualCode, expectedCode)
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma:
    | Awaited<
        ReturnType<typeof import('../src/lib/prisma').getPrisma>
      >
    | undefined

  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deployAndSeed()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    const requests = await import('../src/lib/requests/request-service')
    prisma = getPrisma()

    const sector = await prisma.sector.findUniqueOrThrow({
      where: { slug: 'bouw' },
    })
    const owner = await prisma.user.create({
      data: {
        email: 'm7d-owner@example.invalid',
        displayName: 'M7D eigenaar',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    const organization = await prisma.organization.create({
      data: {
        name: 'TEST-WM-M7D Opdrachtgever',
        organizationType: 'CLIENT',
        status: 'ACTIVE',
        generalEmail: 'contact-m7d@example.invalid',
        phone: '+31 20 000 7001',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })
    await prisma.organizationLocation.create({
      data: {
        organizationId: organization.id,
        label: 'Hoofdvestiging',
        addressLine: 'Testlaan 7',
        postalCode: '1007 TA',
        city: 'Utrecht',
        province: 'Utrecht',
        countryCode: 'NL',
        isPrimary: true,
      },
    })
    await prisma.organizationSector.create({
      data: {
        organizationId: organization.id,
        sectorId: sector.id,
        isPrimary: true,
      },
    })

    const administrator = await prisma.user.create({
      data: {
        email: 'm7d-admin@example.invalid',
        displayName: 'M7D beheerder',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: administrator.id,
        organizationId: organization.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })

    const otherOwner = await prisma.user.create({
      data: {
        email: 'm7d-other@example.invalid',
        displayName: 'Andere eigenaar',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    const otherOrganization = await prisma.organization.create({
      data: {
        name: 'TEST-WM-M7D Andere opdrachtgever',
        organizationType: 'CLIENT',
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: otherOwner.id,
        organizationId: otherOrganization.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })

    const createDossier = async (
      dossierCode: string,
      status: 'ADVICE_READY' | 'COMPLETED' = 'COMPLETED',
    ) => {
      const dossier = await prisma!.adviceDossier.create({
        data: {
          dossierCode,
          ownerUserId: owner.id,
          organizationId: organization.id,
          sourceRoute: 'KNOWLEDGE',
          subject: 'Ergonomie bij tilliftgebruik',
          status,
          currentVersionNumber: 1,
          completedAt:
            status === 'COMPLETED'
              ? new Date('2026-07-30T08:00:00Z')
              : null,
        },
      })
      await prisma!.adviceDossierVersion.create({
        data: {
          adviceDossierId: dossier.id,
          versionNumber: 1,
          originalHelpRequest:
            'Zijn er richtlijnen voor vloeren om er met een tillift overheen te rijden?',
          situationSummary:
            'U wilt weten hoe vloerweerstand en werkplekinrichting het veilig verplaatsen van een tillift beïnvloeden.',
          subject: 'Ergonomie bij tilliftgebruik',
          adviceTitle: 'Beoordeel fysieke belasting en werkplekinrichting',
          adviceBody: 'Een ergonoom kan de feitelijke belasting en werkplek beoordelen.',
          adviceReasons: ['Duw- en trekkrachten hangen samen met de ondergrond en route.'],
          selfActions: ['Leg vloerwisselingen, drempels en routes vast.'],
          primaryProfessionalRequirementSnapshot: {
            label: 'Ergonoom',
            priority: 'PRIMARY',
            reason: 'Beoordeelt fysieke belasting en werkplekinrichting',
            expertise: ['ergonomie', 'duw- en trekkrachten'],
            capabilityCodes: ['ergonoom'],
          },
          additionalProfessionalRequirementsSnapshot: [
            {
              label: 'Arbeidsdeskundige',
              priority: 'ADDITIONAL',
              reason: 'Beoordeelt taakbelasting en inzetbaarheid',
              expertise: ['taakbelasting'],
              capabilityCodes: ['arbeidsdeskundige'],
            },
            {
              label: 'Hoger Veiligheidskundige (HVK)',
              priority: 'POSSIBLE',
              reason: 'Kan complexe werkplekveiligheid beoordelen',
              expertise: ['werkplekveiligheid'],
              capabilityCodes: ['hogere-veiligheidskundige'],
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
      return dossier
    }

    const dossier = await createDossier('WM-2026-700001')
    const incompleteDossier = await createDossier(
      'WM-2026-700002',
      'ADVICE_READY',
    )
    const ownerViewer = {
      userId: owner.id,
      organizationId: organization.id,
      organizationRole: 'OWNER' as const,
    }
    const preview = await requests.getRequestPublicationPreview(
      ownerViewer,
      dossier.id,
    )
    assert.equal(preview.publicSummary.startsWith('U wilt weten'), true)
    assert.equal(preview.expertise.primary, 'Ergonoom')
    assert.deepEqual(preview.expertise.additional, [
      'Arbeidsdeskundige',
    ])
    assert.deepEqual(preview.expertise.possible, [
      'Hoger Veiligheidskundige (HVK)',
    ])
    assert.equal(preview.organization.region, 'Utrecht')
    assert.equal(preview.organization.sector, 'Bouw')

    await expectRequestError(
      () =>
        requests.getRequestPublicationPreview(
          {
            userId: administrator.id,
            organizationId: organization.id,
            organizationRole: 'ADMIN',
          },
          dossier.id,
        ),
      'NOT_FOUND',
    )
    await expectRequestError(
      () =>
        requests.getRequestPublicationPreview(
          {
            userId: otherOwner.id,
            organizationId: otherOrganization.id,
            organizationRole: 'OWNER',
          },
          dossier.id,
        ),
      'NOT_FOUND',
    )
    await expectRequestError(
      () =>
        requests.getRequestPublicationPreview(
          ownerViewer,
          incompleteDossier.id,
        ),
      'NOT_ELIGIBLE',
    )

    const publication = {
      adviceDossierId: dossier.id,
      publicSummary:
        'U zoekt professionele ondersteuning om uw veiligheidssituatie zorgvuldig te beoordelen.',
      requestedStart: 'WITHIN_ONE_MONTH' as const,
      notes: 'Neem eerst contact op met de eigenaar.',
    }
    const race = await Promise.all(
      Array.from({ length: 6 }, () =>
        requests.publishRequest({
          viewer: ownerViewer,
          publication,
          at: new Date('2026-07-30T09:30:00Z'),
        }),
      ),
    )
    assert.equal(new Set(race.map((item) => item.id)).size, 1)
    assert.equal(await prisma.request.count(), 1)
    const created = await prisma.request.findUniqueOrThrow({
      where: { id: race[0]!.id },
      include: { events: true },
    })
    assert.match(created.requestNumber, /^WM-R-2026-\d{6}$/)
    assert.equal(created.status, 'PUBLISHED')
    assert.equal(created.tenantId, organization.id)
    assert.equal(created.organizationId, organization.id)
    assert.equal(created.primaryExpertise, 'Ergonoom')
    assert.deepEqual(created.primaryExpertiseCodes, ['ergonoom'])
    assert.deepEqual(created.additionalExpertise, [
      'Arbeidsdeskundige',
    ])
    assert.deepEqual(created.additionalExpertiseCodes, [
      'arbeidsdeskundige',
    ])
    assert.deepEqual(created.possibleExpertise, [
      'Hoger Veiligheidskundige (HVK)',
    ])
    assert.deepEqual(created.possibleExpertiseCodes, [
      'hogere-veiligheidskundige',
    ])
    assert.equal(created.events.length, 2)
    assert.deepEqual(
      new Set(created.events.map((event) => event.type)),
      new Set([
        'REQUEST_PUBLISHED',
        'ELIGIBILITY_SNAPSHOT_CREATED',
      ]),
    )

    const secondDossier = await createDossier('WM-2026-700003')
    const secondRequest = await requests.publishRequest({
      viewer: ownerViewer,
      publication: {
        ...publication,
        adviceDossierId: secondDossier.id,
      },
      at: new Date('2026-07-30T09:31:00Z'),
    })
    assert.notEqual(secondRequest.requestNumber, created.requestNumber)
    assert.equal(await prisma.request.count(), 2)

    const ownList = await requests.listOwnRequests(ownerViewer)
    assert.equal(ownList.length, 2)
    assert.equal(
      await requests.listOwnRequests({
        userId: otherOwner.id,
        organizationId: otherOrganization.id,
        organizationRole: 'OWNER',
      }).then((items) => items.length),
      0,
    )
    await expectRequestError(
      () =>
        requests.getOwnRequest(
          {
            userId: otherOwner.id,
            organizationId: otherOrganization.id,
            organizationRole: 'OWNER',
          },
          created.id,
        ),
      'NOT_FOUND',
    )

    await assert.rejects(
      prisma.request.update({
        where: { id: created.id },
        data: { publicSummary: 'Deze wijziging moet worden geweigerd.' },
      }),
    )
    await assert.rejects(
      prisma.requestEvent.delete({
        where: { id: created.events[0]!.id },
      }),
    )
    assert.equal(await prisma.marketplaceMatchRun.count(), 0)
    assert.equal(await prisma.providerInvitation.count(), 0)
    assert.equal(await prisma.quote.count(), 0)
    assert.equal(await prisma.creditTransaction.count(), 0)

    console.log(
      'Aanvraagpublicatie-integriteit: eigenaarautorisatie, tenantisolatie, idempotentie, nummering en immutable historie geslaagd.',
    )
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName],
    )
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
