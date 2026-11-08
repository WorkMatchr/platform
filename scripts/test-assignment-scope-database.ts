// Run only in a disposable, empty PostgreSQL fixture. No application/provider credentials.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { hashPassword } from 'better-auth/crypto'
import { getPrisma } from '../src/lib/prisma'
import {
  readAssignmentScope,
  checkRunScope,
  scopedCapabilities,
} from '../src/lib/marketplace/assignment-scope-service'
import { clientScope, reviewScope } from '../src/lib/marketplace/assignment-scope-workflow'
import { runMarketplaceMatching } from '../src/lib/marketplace/matching-service'
import { scopeReference, standardTasks } from '../src/lib/marketplace/assignment-scope'
import { prepareReviewedSupplier } from './fixtures/reviewed-marketplace-provider'
import { deliverAssignmentEmails } from '../src/lib/marketplace/assignment-email-worker'
import { requestScopeCandidates } from '../src/lib/requests/request-scope-service'
async function main() {
  const u = new URL(process.env.DATABASE_URL ?? '')
  assert.equal(u.hostname, '127.0.0.1')
  assert.match(u.pathname, /^\/workmatchr_scope_[a-f0-9]{12}$/)
  const db = getPrisma(),
    now = new Date(),
    end = new Date(+now + 86400000)
  try {
    assert.equal(await db.organization.count(), 0)
    const client = await db.organization.create({
      data: { name: 'Testorganisatie', organizationType: 'CLIENT', status: 'ACTIVE' },
    })
    const platform = await db.organization.create({
      data: {
        name: 'Testbeheer',
        organizationType: 'PLATFORM_OPERATOR',
        status: 'ACTIVE',
        systemKey: 'WORKMATCHR_PLATFORM',
      },
    })
    const owner = await db.user.create({
      data: {
        email: 'scope-client@example.invalid',
        emailVerified: true,
        status: 'ACTIVE',
        accountType: 'CLIENT',
        memberships: { create: { organizationId: client.id, role: 'OWNER', status: 'ACTIVE' } },
      },
    })
    const admin = await db.user.create({
      data: {
        email: 'scope-admin@example.invalid',
        emailVerified: true,
        status: 'ACTIVE',
        platformRole: 'ADMIN',
        memberships: { create: { organizationId: platform.id, role: 'ADMIN', status: 'ACTIVE' } },
      },
    })
    if (process.env.SCOPE_BROWSER_PASSWORD)
      await db.account.create({
        data: {
          userId: owner.id,
          accountId: owner.id,
          providerId: 'credential',
          password: await hashPassword(process.env.SCOPE_BROWSER_PASSWORD),
        },
      })
    async function term(kind: 'SERVICE' | 'SPECIALISM' | 'QUALIFICATION', code: string, label: string) {
      const tax = await db.providerTaxonomy.create({ data: { kind, code: kind, name: kind } })
      const v = await db.providerTaxonomyVersion.create({
        data: { taxonomyId: tax.id, version: 2, status: 'DRAFT' },
      })
      const t = await db.providerTaxonomyTerm.create({ data: { versionId: v.id, code, label, sortOrder: 1 } })
      if(kind==='SERVICE'){
        let order=2
        for(const key of Object.keys(standardTasks).filter(k=>k!==code))await db.providerTaxonomyTerm.create({data:{versionId:v.id,code:key,label:key,sortOrder:order++}})
      }
      await db.providerTaxonomyVersion.update({
        where: { id: v.id },
        data: { status: 'PUBLISHED', publishedAt: now, checksum: 'b'.repeat(64) },
      })
      return t
    }
    const service = await term('SERVICE', 'ERGONOMICS', 'Ergonomie'),
      neutral = await term('QUALIFICATION', 'STANDARD_SERVICE_SCOPE', scopeReference)
    const st = await term('SPECIALISM', 'ergonoom', 'Ergonoom')
    const spec = await db.specialism.create({
      data: {
        name: 'Ergonoom',
        slug: 'ergonoom',
        providerSpecialismTaxonomyMap: { create: { termId: st.id } },
      },
    })
    const cfg = await db.providerCapabilityRequirementConfig.create({
      data: { version: 1, effectiveFrom: new Date(+now - 10000), effectiveUntil: end },
    })
    await db.providerCapabilityQualificationRequirement.create({
      data: {
        configId: cfg.id,
        serviceTermId: service.id,
        requirementTermId: neutral.id,
        kind: 'QUALIFICATION',
        isRequired: false,
        minimumVerification: 'SELF_DECLARED',
        requiresValidity: false,
      },
    })
    for(const t of await db.providerTaxonomyTerm.findMany({where:{versionId:service.versionId,id:{not:service.id}}})){
      await db.providerCapabilityQualificationRequirement.create({data:{configId:cfg.id,serviceTermId:t.id,requirementTermId:neutral.id,kind:'QUALIFICATION',isRequired:false,minimumVerification:'SELF_DECLARED',requiresValidity:false}})
    }
    async function assignment(task: string) {
      const fields = {
        title: task,
        description: task,
        primarySpecialismId: spec.id,
        responseDeadline: end,
        locationType: 'REMOTE' as const,
        allowsRemoteWork: true,
      }
      const a = await db.assignment.create({
        data: { ...fields, clientOrganizationId: client.id, createdByUserId: owner.id },
      })
      await db.assignmentRevision.create({
        data: { ...fields, assignmentId: a.id, version: 1, changedByUserId: owner.id },
      })
      return db.assignment.update({
        where: { id: a.id },
        data: { status: 'OPEN', publishedVersion: 1, publishedAt: now },
      })
    }
    const good = await assignment(standardTasks.ERGONOMICS.task),
      bad = await assignment('Verricht een medische belastbaarheidsbeoordeling voor onze werknemers.'),
      free = await assignment('Adviseer over onze bureaustoelen en werkplekken.')
    const read = (id: string, at = now) =>
      db.$transaction((tx) => readAssignmentScope(tx, id, 'ERGONOMICS', at))
    assert.equal((await read(good.id)).state, 'BEOORDELING_NODIG')
    await db.providerCapabilityRequirementConfig.update({
      where: { id: cfg.id },
      data: { publishedAt: now, status: 'PUBLISHED', checksum: 'a'.repeat(64) },
    })
    for(const [code,text] of [['SAFETY_ADVICE','Wettelijke RI&E-toets uitvoeren'],['REINTEGRATION_FIRST_TRACK','Medische belastbaarheidsbeoordeling uitvoeren'],['REINTEGRATION_SECOND_TRACK','Formeel WIA-/UWV-oordeel afgeven'],['INCIDENT_INVESTIGATION','Particulier rechercheonderzoek uitvoeren']]){
      const a=await assignment(text)
      assert.equal((await db.$transaction(tx=>readAssignmentScope(tx,a.id,code,now))).state,'BUITEN_SCOPE')
      await assert.rejects(runMarketplaceMatching({actorUserId:owner.id,organizationId:client.id,assignmentId:a.id,expectedAssignmentVersion:1,idempotencyKey:randomUUID(),scopeService:code}),{code:'NOT_SELECTABLE'})
    }
    assert.equal(await db.marketplaceMatchCandidate.count(),0);assert.equal(await db.notificationOutbox.count(),0)
    console.log('PASS 4 regulated tasks refused by real selection; zero candidates and outbox jobs.')
    const normal = await read(good.id)
    assert.equal(normal.state, 'BINNEN_SCOPE')
    assert.equal((await read(bad.id)).state, 'BUITEN_SCOPE')
    assert.equal((await read(good.id, end)).reviewable, false)
    const initial = await read(free.id)
    assert.equal(initial.reviewable, true)
    await clientScope(owner.id, client.id, free.id, 'ERGONOMICS', true, initial.digest)
    await assert.rejects(
      reviewScope(owner.id, free.id, 'ERGONOMICS', initial.digest, true, 'Synthetische beoordeling.'),
      { code: 'ACCESS_DENIED' },
    )
    const reviews = await Promise.allSettled(
      [1, 2].map(() =>
        reviewScope(
          admin.id,
          free.id,
          'ERGONOMICS',
          initial.digest,
          true,
          'Niet-medisch advies over bureaustoelen.',
        ),
      ),
    )
    assert.equal(reviews.filter((r) => r.status === 'fulfilled').length, 1)
    assert.equal((await read(free.id)).state, 'BINNEN_SCOPE')
    await db.assignment.update({
      where: { id: free.id },
      data: { description: 'Nu ook een medische beoordeling uitvoeren.' },
    })
    await assert.rejects(
      db.$transaction((tx) =>
        checkRunScope(tx, free.id, { scopeService: 'ERGONOMICS', scopeDigest: initial.digest }, now),
      ),
    )
    const run = (id: string, key: string) =>
      runMarketplaceMatching({
        actorUserId: owner.id,
        organizationId: client.id,
        assignmentId: id,
        expectedAssignmentVersion: 1,
        idempotencyKey: key,
        scopeService: 'ERGONOMICS',
      })
    await assert.rejects(run(bad.id, randomUUID()))
    assert.equal(await db.marketplaceMatchRun.count(), 0)
    assert.deepEqual(await db.$transaction((tx) => scopedCapabilities(tx, randomUUID(), normal, now)), [])
    assert.equal((await db.$transaction((tx) => requestScopeCandidates(tx, randomUUID(), now))).size, 0)
    const key = randomUUID()
    const parallel = await Promise.allSettled([run(good.id, key), run(good.id, key)])
    assert.ok(parallel.some((r) => r.status === 'fulfilled'))
    assert.equal(await db.marketplaceMatchRun.count(), 1)
    assert.equal((await run(good.id, key)).assignmentId, good.id)
    assert.equal(await db.providerInvitation.count(), 0)
    const agency = await db.organization.create({
      data: { name: 'Synthetisch ergonomiebureau', organizationType: 'PROVIDER', status: 'ACTIVE' },
    })
    await db.user.create({
      data: {
        email: 'scope-provider@example.invalid',
        status: 'ACTIVE',
        accountType: 'PROFESSIONAL',
        emailVerified: true,
        assignmentEmailEnabled: true,
        memberships: { create: { organizationId: agency.id, status: 'ACTIVE', role: 'OWNER' } },
      },
    })
    const profile = await db.providerProfile.create({
      data: {
        organizationId: agency.id,
        lifecycleStatus: 'QUALIFIED',
        readinessStatus: 'READY',
        platformQualificationStatus: 'QUALIFIED',
        selectabilityStatus: 'SELECTABLE',
      },
    })
    const sourceVersion = await prepareReviewedSupplier(db, profile.id, agency.id, {
      serviceTermId: service.id,
      specialismTermId: st.id,
      configId: cfg.id,
    })
    const readiness = await db.providerReadinessAssessment.create({
      data: {
        providerProfileId: profile.id,
        status: 'READY',
        reasonCodes: [],
        sourceVersion,
        checksum: 'b'.repeat(64),
      },
    })
    const selectable = await db.providerSelectabilityAssessment.create({
      data: {
        providerProfileId: profile.id,
        status: 'SELECTABLE',
        sourceVersion,
        reasonCodes: [],
        readinessAssessmentId: readiness.id,
        checksum: 'c'.repeat(64),
      },
    })
    await db.trustedProviderProjection.create({
      data: {
        providerProfileId: profile.id,
        readinessAssessmentId: readiness.id,
        selectabilityAssessmentId: selectable.id,
        schemaVersion: 2,
        canonicalizationVersion: 'WORKMATCHR-CJ-1',
        sourceVersion,
        payload: {
          capabilities: [
            { serviceCode: 'ERGONOMICS', specialismCode: 'ergonoom', deliveryModes: ['REMOTE'] },
          ],
          sectors: [],
          workAreas: [{ regionCode: 'NATIONWIDE' }],
        },
        sha256: 'd'.repeat(64),
        validFrom: now,
        validUntil: end,
      },
    })
    await db.marketplaceRuleSet.create({
      data: {
        participationPriceCredits: 25,
        minimumParticipationPrice: 5,
        changeReason: 'Synthetische controle',
        status: 'PUBLISHED',
        createdByUserId: admin.id,
        version: 'scope-test',
        validFrom: now,
      },
    })
    const raceAssignment = await assignment(standardTasks.ERGONOMICS.task)
    let locked!: () => void, release!: () => void
    const held = new Promise<void>((r) => {
        locked = r
      }),
      continueEdit = new Promise<void>((r) => {
        release = r
      })
    const edit = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Assignment" WHERE id=${raceAssignment.id}::uuid FOR UPDATE`
      locked()
      await continueEdit
      await tx.assignment.update({
        where: { id: raceAssignment.id },
        data: { description: 'Neem ook een medische beoordeling op.' },
      })
    })
    await held
    const competing = run(raceAssignment.id, randomUUID())
    release()
    await edit
    await assert.rejects(competing)
    assert.equal(await db.providerInvitation.count({ where: { assignmentId: raceAssignment.id } }), 0)
    const queued = await assignment(standardTasks.ERGONOMICS.task)
    const q = await run(queued.id, randomUUID())
    assert.equal(q.invitations.length, 1)
    assert.equal(q.candidates[0].status, 'SELECTED')
    await db.assignment.update({
      where: { id: queued.id },
      data: { description: 'Verricht ook een medische beoordeling.' },
    })
    let deliveries = 0
    const mail = await deliverAssignmentEmails({
      send: async () => {
        deliveries++
        throw Error('Unexpected transport')
      },
    })
    assert.equal(deliveries, 0)
    assert.equal(mail.failed, 1)
    assert.equal(
      (
        await db.notificationOutbox.findFirstOrThrow({
          where: { eventId: 'INVITATION:' + q.invitations[0].id },
        })
      ).lastErrorCode,
      'INVITATION_NOT_DELIVERABLE',
    )
    await assert.rejects(run(queued.id, q.idempotencyKey))
    const later = await assignment(standardTasks.ERGONOMICS.task)
    const newCfg = await db.providerCapabilityRequirementConfig.create({
      data: { version: 2, effectiveFrom: end },
    })
    await db.providerCapabilityQualificationRequirement.create({
      data: {
        configId: newCfg.id,
        serviceTermId: service.id,
        requirementTermId: neutral.id,
        kind: 'QUALIFICATION',
        isRequired: false,
        minimumVerification: 'SELF_DECLARED',
        requiresValidity: false,
      },
    })
    await db.providerCapabilityRequirementConfig.update({
      where: { id: newCfg.id },
      data: { status: 'PUBLISHED', publishedAt: now, checksum: 'e'.repeat(64) },
    })
    const nextPolicy = await read(later.id, end)
    assert.equal(nextPolicy.configId, newCfg.id)
    assert.deepEqual(await db.$transaction((tx) => scopedCapabilities(tx, profile.id, nextPolicy, end)), [])
    console.log(
      'PASS eligible supplier selected; stale queued invitation suppressed without transport; stale qualification cannot transfer to next config.',
    )
    const deliverable = await assignment(standardTasks.ERGONOMICS.task)
    await run(deliverable.id, randomUUID())
    const ok = await deliverAssignmentEmails({
      send: async () => ({
        accepted: true,
        transport: 'RESEND',
        status: 'ACCEPTED',
        messageId: 'synthetic-receipt',
      }),
    })
    assert.equal(ok.sent, 1)
    console.log('PASS current invitation dispatched once through fake transport.')
    const fresh = await assignment(standardTasks.ERGONOMICS.task)
    if (process.env.SCOPE_BROWSER_CASE)
      writeFileSync(process.env.SCOPE_BROWSER_CASE, JSON.stringify({ good: fresh.id, bad: bad.id }))
    console.log(
      'PASS draft, published, excluded, expiry, review authorization, simultaneous decisions, text replacement, blocked selection, missing qualification, legacy snapshot, concurrent selection, replay.',
    )
  } finally {
    await db.$disconnect()
  }
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
