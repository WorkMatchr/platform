import type { Prisma } from '../src/generated/prisma/client'
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
          at: new Date('2026-08-01T09:30:00Z'),
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
      at: new Date('2026-08-01T09:31:00Z'),
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

    // Same canonical publication chain, including topic-only and UNKNOWN requests.
    const { publishSimpleAdviceRequest } = await import('../src/lib/requests/simple-advice-service')
    const { randomUUID } = await import('node:crypto')
    const simpleViewer = { userId: owner.id, organizationId: organization.id, organizationRole: 'OWNER' as const, isPlatformAdministrator: false }
    const basic = { routeChoice: 'NEEDS_TOPIC', helpTopic: 'UNKNOWN', requestTitle: 'Onze eigen titel', requestDescription: 'Wij willen hulp bij een nog onbekend onderwerp.', desiredOutcome: 'ADVICE', workLocationMode: 'REMOTE', desiredStartMode: 'SPECIFIC_DATE', desiredStartDate: '2026-12-12' }
    const submissionId = randomUUID()
    const results = await Promise.all([publishSimpleAdviceRequest(simpleViewer, submissionId, basic), publishSimpleAdviceRequest(simpleViewer, submissionId, basic)])
    assert.equal(results[0].id, results[1].id)
    const simpleRequest = await prisma.request.findUniqueOrThrow({ where: { id: results[0].id }, include: { events: true, adviceDossier: { include: { versions: true } } } })
    assert.equal(simpleRequest.status, 'PUBLISHED')
    assert.equal(simpleRequest.title, basic.requestTitle)
    assert.equal(simpleRequest.primaryExpertise, null)
    assert.deepEqual(simpleRequest.primaryExpertiseCodes, [])
    assert.equal(simpleRequest.region, null)
    assert.ok(simpleRequest.notes?.includes('12-12-2026'))
    assert.equal(simpleRequest.events.length, 1)
    assert.equal(simpleRequest.adviceDossier.versions[0].completionStatus, 'COMPLETED_WITH_USER_INPUT')
    assert.ok(simpleRequest.adviceDossier.versions[0].simpleRequestSnapshot)
    await expectRequestError(() => publishSimpleAdviceRequest({ ...simpleViewer, userId: otherOwner.id, organizationId: otherOrganization.id }, submissionId, basic), 'NOT_FOUND')
    await expectRequestError(() => publishSimpleAdviceRequest({ ...simpleViewer, organizationId: otherOrganization.id }, randomUUID(), basic), 'ACCESS_DENIED')
    await expectRequestError(() => publishSimpleAdviceRequest(simpleViewer, submissionId, { ...basic, requestTitle: 'gewijzigd' }), 'CONFLICT')
    await assert.rejects(prisma.adviceDossierVersion.update({ where: { id: simpleRequest.adviceDossier.versions[0].id }, data: { simpleRequestSnapshot: {} } }))
    await assert.rejects(prisma.request.update({ where: { id: simpleRequest.id }, data: { primaryExpertise: 'HVK' } }))
    const invalidLocationId = randomUUID()
    const invalidSubmission = randomUUID()
    await expectRequestError(() => publishSimpleAdviceRequest(simpleViewer, invalidSubmission, { ...basic, workLocationMode: 'ORGANIZATION', organizationLocationId: invalidLocationId }), 'NOT_ELIGIBLE')
    assert.equal(await prisma.adviceDossier.count({ where: { id: invalidSubmission } }), 0)
    const freePlace = await publishSimpleAdviceRequest(simpleViewer, randomUUID(), { ...basic, workLocationMode: 'ORGANIZATION', organizationLocationId: null, organizationLocationCity: 'Leiden' })
    const freePlaceRequest = await prisma.request.findUniqueOrThrow({ where: { id: freePlace.id } })
    assert.equal(freePlaceRequest.region, 'Leiden')
    assert.ok(freePlaceRequest.notes?.includes('Leiden'))
    const { deriveSimpleAdviceTitle } = await import('../src/lib/requests/simple-advice-contract')
    const description = 'Wij willen de werkplek laten beoordelen en verbeteren.'
    const derivedTitleRequest = await publishSimpleAdviceRequest(simpleViewer, randomUUID(), { ...basic, requestDescription: description, requestTitle: deriveSimpleAdviceTitle(description) })
    assert.equal((await prisma.request.findUniqueOrThrow({ where: { id: derivedTitleRequest.id } })).title, description)
    const withAdditional = await publishSimpleAdviceRequest(simpleViewer, randomUUID(), { ...basic, routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'HVK', additionalExpertises: ['MVK', 'ARBEIDSHYGIENIST'] })
    const additionalRequest = await prisma.request.findUniqueOrThrow({ where: { id: withAdditional.id }, include: { adviceDossier: { include: { versions: true } } } })
    assert.deepEqual(additionalRequest.primaryExpertiseCodes, ['HVK'])
    assert.deepEqual(additionalRequest.additionalExpertiseCodes, ['MVK', 'ARBEIDSHYGIENIST'])
    assert.equal(additionalRequest.additionalExpertise.length, 2)
    assert.deepEqual(additionalRequest.possibleExpertiseCodes, [])
    const snapshot = additionalRequest.adviceDossier.versions[0].simpleRequestSnapshot as { primaryExpertise: string; additionalExpertises: string[]; expertiseSelectionSource: string }
    assert.equal(snapshot.primaryExpertise, 'HVK')
    assert.deepEqual(snapshot.additionalExpertises, ['MVK', 'ARBEIDSHYGIENIST'])
    assert.equal(snapshot.expertiseSelectionSource, 'USER_SELECTED')
    await assert.rejects(prisma.request.update({ where: { id: withAdditional.id }, data: { additionalExpertiseCodes: ['BEDRIJFSARTS'] } }))
    await assert.rejects(prisma.adviceDossierVersion.update({ where: { id: additionalRequest.adviceDossier.versions[0].id }, data: { simpleRequestSnapshot: { ...snapshot, additionalExpertises: [] } } }))
    await assert.rejects(publishSimpleAdviceRequest(simpleViewer, randomUUID(), { ...basic, routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'HVK', additionalExpertises: ['MVK','ARBEIDSHYGIENIST','INCIDENTONDERZOEK'] }))
    const routeA = await publishSimpleAdviceRequest(simpleViewer, randomUUID(), { ...basic, routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'MVK', workLocationMode: 'OTHER_LOCATION', otherLocationCity: 'Delft' })
    const routeARequest = await prisma.request.findUniqueOrThrow({ where: { id: routeA.id } })
    assert.deepEqual(routeARequest.primaryExpertiseCodes, ['MVK'])
    assert.equal(routeARequest.region, 'Delft')
    const { responseDeadline } = await import('../src/lib/requests/response-deadline-policy')
    const { handoffRequest } = await import('../src/lib/requests/request-assignment-handoff')
    const { getMarketplaceDashboard, getAssignmentSelectionView } = await import('../src/lib/marketplace/dashboard-query-service')
    const { listAssignmentsForOrganization, getAssignmentDetail } = await import('../src/lib/assignments/assignment-query-service')
    const { runMarketplaceMatching } = await import('../src/lib/marketplace/matching-service')
    const linked = await prisma.assignment.findUniqueOrThrow({ where: { requestId: simpleRequest.id }, include: { requestHandoff: true, revisions: true, statusHistory: true } })
    assert.equal(linked.status, 'OPEN')
    assert.equal(linked.primarySpecialismId, null)
    assert.equal(linked.responseDeadline?.toISOString(), responseDeadline(simpleRequest.publishedAt!).toISOString())
    assert.equal(linked.revisions.length, 1)
    assert.equal(linked.statusHistory.length, 1)
    assert.ok(linked.requestHandoff)
    assert.equal(await prisma.providerInvitation.count({ where: { assignmentId: linked.id } }), 0)
    assert.equal(await prisma.marketplaceMatchRun.count({ where: { assignmentId: linked.id } }), 0)
    assert.equal(await prisma.requestEligibleProvider.count({ where: { requestId: simpleRequest.id } }), 0)
    await assert.rejects(prisma.requestAssignmentHandoff.update({ where: { id: linked.requestHandoff!.id }, data: { snapshot: {} } }))
    const secondHandoff = await prisma.$transaction(tx => handoffRequest(tx, { requestId: simpleRequest.id, organizationId: organization.id, actorUserId: owner.id, sourceVersionId: simpleRequest.adviceDossier.versions[0].id, at: new Date(), mode: 'PUBLICATION' }), { isolationLevel: 'Serializable' })
    assert.equal(secondHandoff.assignmentId, linked.id)
    await assert.rejects(prisma.$transaction(tx => handoffRequest(tx, { requestId: simpleRequest.id, organizationId: otherOrganization.id, actorUserId: otherOwner.id, sourceVersionId: simpleRequest.adviceDossier.versions[0].id, at: new Date(), mode: 'PUBLICATION' })))
    const dashboard = await getMarketplaceDashboard(owner.id, organization.id)
    assert.equal(dashboard.kind, 'CLIENT')
    if (dashboard.kind !== 'CLIENT') throw Error('Dashboard kind')
    assert.equal(dashboard.summary.published, await prisma.assignment.count({ where: { clientOrganizationId: organization.id, publishedAt: { not: null } } }))
    assert.ok(dashboard.assignments.some(a => a.id === simpleRequest.id))
    assert.equal(dashboard.summary.activeAdviceDossiers, await prisma.adviceDossier.count({ where: { organizationId: organization.id, status: { not: 'ARCHIVED' } } }))
    const list = await listAssignmentsForOrganization(owner.id, organization.id)
    assert.equal(list.items.filter(a => a.id === simpleRequest.id).length, 1)
    assert.equal((await getAssignmentDetail(owner.id, organization.id, simpleRequest.id)).id, simpleRequest.id)
    await assert.rejects(getAssignmentDetail(otherOwner.id, otherOrganization.id, simpleRequest.id))
    assert.equal((await getAssignmentSelectionView(owner.id, organization.id, simpleRequest.id)).assignment.matchingBlockReason, 'PRIMARY_EXPERTISE_REQUIRED')
    await assert.rejects(runMarketplaceMatching({ actorUserId: owner.id, organizationId: organization.id, assignmentId: simpleRequest.id, expectedAssignmentVersion: 1, idempotencyKey: randomUUID() }))
    const selectedAssignment = await prisma.assignment.findUniqueOrThrow({ where: { requestId: withAdditional.id }, include: { primarySpecialism: true, specialisms: { include: { specialism: true } }, requestHandoff: true } })
    assert.equal(selectedAssignment.primarySpecialism?.slug, 'hogere-veiligheidskundige')
    assert.deepEqual(selectedAssignment.specialisms.filter(s => !s.isRequired).map(s => s.specialism.slug).sort(), ['arbeidshygienist','middelbare-veiligheidskundige'])
    const preserved = selectedAssignment.requestHandoff!.snapshot as { primaryExpertise: string; additionalExpertises: string[]; expertiseSelectionSource: string }
    assert.equal(preserved.primaryExpertise, 'HVK')
    assert.deepEqual(preserved.additionalExpertises, ['MVK','ARBEIDSHYGIENIST'])
    assert.equal(preserved.expertiseSelectionSource, 'USER_SELECTED')
    const run = await runMarketplaceMatching({ actorUserId: owner.id, organizationId: organization.id, assignmentId: withAdditional.id, expectedAssignmentVersion: 1, idempotencyKey: randomUUID() })
    assert.equal(run.assignmentId, selectedAssignment.id)
    assert.equal(await prisma.requestAssignmentHandoff.count({ where: { requestId: simpleRequest.id } }), 1)
    assert.equal(await prisma.assignment.count({ where: { requestId: simpleRequest.id } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { entityId: simpleRequest.id, action: 'REQUEST_ASSIGNMENT_HANDOFF' } }), 1)
    const platform = await prisma.organization.create({ data: { name: 'TEST-WM Handoff platform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } })
    const operator = await prisma.user.create({ data: { email: 'handoff-operator@example.invalid', status: 'ACTIVE', platformRole: 'ADMIN' } })
    await prisma.organizationMembership.create({ data: { userId: operator.id, organizationId: platform.id, role: 'OWNER', status: 'ACTIVE' } })
    const sourceVersion = simpleRequest.adviceDossier.versions[0]
    const { id: omittedId, adviceDossierId: omittedDossier, createdAt: omittedAt, ...versionData } = sourceVersion
    void omittedId; void omittedDossier; void omittedAt
    const orphanDossier = await prisma.adviceDossier.create({ data: { dossierCode: 'TEST-RECOVERY-001', ownerUserId: owner.id, organizationId: organization.id, sourceRoute: 'SIMPLE_ADVICE', subject: basic.requestTitle, status: 'COMPLETED', versions: { create: JSON.parse(JSON.stringify(versionData)) as Prisma.AdviceDossierVersionUncheckedCreateWithoutAdviceDossierInput } }, include: { versions: true } })
    const orphan = await prisma.request.create({ data: { requestNumber: 'TEST-RECOVERY-001', tenantId: organization.id, organizationId: organization.id, adviceDossierId: orphanDossier.id, title: basic.requestTitle, publicSummary: basic.requestDescription, requestedStart: 'SPECIFIC_DATE', status: 'PUBLISHED', publishedAt: new Date('2026-09-01T10:00:00Z') } })
    const { recoverRequestAssignments } = await import('../src/lib/requests/request-assignment-handoff')
    await expectRequestError(() => recoverRequestAssignments(operator.id, [{ requestId: orphan.id, organizationId: organization.id, sourceVersionId: orphanDossier.versions[0].id }]), 'NOT_ELIGIBLE')
    assert.equal(await prisma.assignment.count({ where: { requestId: orphan.id } }), 0)
    await prisma.requestEvent.create({ data: { requestId: orphan.id, actorUserId: owner.id, type: 'REQUEST_PUBLISHED', idempotencyKey: 'test-recovery-publication', occurredAt: orphan.publishedAt! } })
    const recoveryCandidate = { requestId: orphan.id, organizationId: organization.id, sourceVersionId: orphanDossier.versions[0].id }
    const recoveredAt = new Date('2026-09-20T12:00:00Z')
    await assert.rejects(recoverRequestAssignments(owner.id, [recoveryCandidate], recoveredAt))
    const recovered = await recoverRequestAssignments(operator.id, [recoveryCandidate], recoveredAt)
    const again = await recoverRequestAssignments(operator.id, [recoveryCandidate], new Date('2026-09-22T12:00:00Z'))
    assert.equal(recovered[0].id, again[0].id)
    const recoveredAssignment = await prisma.assignment.findUniqueOrThrow({ where: { requestId: orphan.id } })
    assert.equal(recoveredAssignment.responseDeadline?.toISOString(), responseDeadline(recoveredAt).toISOString())
    assert.equal((await prisma.request.findUniqueOrThrow({ where: { id: orphan.id } })).publishedAt!.toISOString(), '2026-09-01T10:00:00.000Z')
    await assert.rejects(recoverRequestAssignments(operator.id, [{ ...recoveryCandidate, organizationId: otherOrganization.id }], recoveredAt))
    await assert.rejects(recoverRequestAssignments(operator.id, [recoveryCandidate, recoveryCandidate], recoveredAt))
    for (const additionalExpertises of [[], ['MVK'], ['MVK','INCIDENTONDERZOEK']]) {
      const published = await publishSimpleAdviceRequest(simpleViewer, randomUUID(), { ...basic, routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'HVK', additionalExpertises })
      const record: Prisma.AssignmentGetPayload<{ include: { specialisms: true; requestHandoff: true } }> = await prisma.assignment.findUniqueOrThrow({ where: { requestId: published.id }, include: { specialisms: true, requestHandoff: true } })
      assert.equal(record.specialisms.filter(s => !s.isRequired).length, additionalExpertises.length)
      assert.deepEqual((record.requestHandoff!.snapshot as { additionalExpertises: string[] }).additionalExpertises, additionalExpertises)
    }
    console.log('Recovery: bounded, admin-only, same adapter, original publication intact, new deadline, repeat no-op PASS.')
    console.log('ADR024 handoff, deadline, immutable audit/snapshot, dashboard, canonical IDs, tenant isolation and matching PASS.')
    console.log('Simple advice: A/B/UNKNOWN publication, immutable input, concurrent idempotency, foreign tenant/location and rollback PASS.')

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
