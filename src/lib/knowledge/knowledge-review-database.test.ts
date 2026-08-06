import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getPrisma } from '@/lib/prisma'
import {
  addKnowledgeSupportingSource,
  decideKnowledgeReview,
  saveKnowledgeReviewDraft,
  withdrawKnowledgeReviewApproval,
  withdrawKnowledgeSupportingSource,
} from './knowledge-review-service'
import { searchKnowledge } from './knowledge-search-service'
import {
  getKnowledgeImprovementReports,
  handleKnowledgeImprovementReport,
  reportKnowledgeImprovement,
} from './knowledge-improvement-service'

const databaseTestEnabled = process.env.KNOWLEDGE_REVIEW_DATABASE_TEST === 'true'
const run = databaseTestEnabled ? describe.sequential : describe.skip
const database = databaseTestEnabled
  ? getPrisma()
  : (undefined as unknown as ReturnType<typeof getPrisma>)
let administratorId = ''
let unauthorizedUserId = ''
let professionalUserId = ''
let sourceVersionId = ''

async function createTask(suffix: string) {
  const topic = await database.knowledgeTopic.create({ data: {
    slug: `review-test-${suffix}`,
    title: `Testonderwerp ${suffix}`,
    description: 'Uitsluitend voor tijdelijke database-integratietest.',
    domain: 'OTHER',
  } })
  const claim = await database.knowledgeClaim.create({ data: {
    externalKey: `review-test:${suffix}`,
    topicId: topic.id,
    claimType: 'OTHER',
    statement: `Historische concepttekst ${suffix}.`,
    applicability: 'Uitsluitend tijdelijke database-integratietest.',
    temporalStatus: 'HISTORICAL',
    validationStatus: 'UNVALIDATED',
    publicationStatus: 'DRAFT',
    accessTier: 'INTERNAL_REVIEWER',
    createdByActor: 'DATABASE_TEST',
  } })
  await database.knowledgeCitation.create({ data: {
    claimId: claim.id,
    sourceVersionId,
    supportType: 'HISTORICAL_ORIGIN',
  } })
  const task = await database.knowledgeReviewTask.create({ data: {
    entityType: 'KnowledgeClaim',
    entityId: claim.id,
    claimId: claim.id,
    reviewReason: 'Tijdelijke integratietest.',
    requiresHumanAction: true,
    controlExceptionType: 'INSUFFICIENT_TRACEABILITY',
    controlExceptionReason: 'De bronherleidbaarheid is onvoldoende voor voorgenomen gebruik.',
    activatedAt: new Date(),
  } })
  return { task, claim }
}

beforeAll(async () => {
  const platform = await database.organization.create({ data: {
    name: 'WorkMatchr tijdelijke reviewtest',
    organizationType: 'PLATFORM_OPERATOR',
    status: 'ACTIVE',
    systemKey: 'WORKMATCHR_PLATFORM',
  } })
  const administrator = await database.user.create({ data: {
    email: 'knowledge-review-admin@example.invalid',
    displayName: 'Tijdelijke kennisbeheerder',
    emailVerified: true,
    status: 'ACTIVE',
    platformRole: 'ADMIN',
  } })
  administratorId = administrator.id
  await database.organizationMembership.create({ data: {
    userId: administrator.id,
    organizationId: platform.id,
    role: 'OWNER',
    status: 'ACTIVE',
  } })
  const unauthorized = await database.user.create({ data: {
    email: 'knowledge-review-user@example.invalid',
    emailVerified: true,
    status: 'ACTIVE',
    platformRole: 'USER',
  } })
  unauthorizedUserId = unauthorized.id
  const providerOrganization = await database.organization.create({ data: {
    name: 'Tijdelijke kennisprofessional',
    organizationType: 'PROVIDER',
    status: 'ACTIVE',
  } })
  await database.providerProfile.create({ data: { organizationId: providerOrganization.id } })
  const professional = await database.user.create({ data: {
    email: 'knowledge-professional@example.invalid',
    emailVerified: true,
    status: 'ACTIVE',
    platformRole: 'USER',
  } })
  professionalUserId = professional.id
  await database.organizationMembership.create({ data: {
    userId: professional.id,
    organizationId: providerOrganization.id,
    role: 'OWNER',
    status: 'ACTIVE',
  } })
  const source = await database.knowledgeSource.create({ data: {
    sourceType: 'AI_SHEET', sourceFormat: 'PDF', code: 'REVIEW-TEST-SOURCE', title: 'Historische testbron',
    publisher: 'Tijdelijke testuitgever', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY',
    authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'HISTORICAL', sourceFamily: 'review-test',
    independenceGroup: 'review-test',
  } })
  const version = await database.knowledgeSourceVersion.create({ data: {
    sourceId: source.id, versionLabel: 'test-v1', extractionStatus: 'EXTRACTED', reviewStatus: 'REVIEW_REQUIRED',
  } })
  sourceVersionId = version.id
})

run('Knowledge Review Workflow-database-integratie', () => {
  it('weigert een onbevoegde actor fail-closed', async () => {
    const { task } = await createTask('unauthorized')
    await expect(saveKnowledgeReviewDraft(unauthorizedUserId, {
      reviewTaskId: task.id,
      expectedVersion: 1,
      proposedStatement: 'Deze tekst mag niet worden opgeslagen.',
    })).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
  })

  it('bewaart concept, uitstel, bronnen, goedkeuring en intrekking append-only', async () => {
    const { task, claim } = await createTask('lifecycle')
    const saved = await saveKnowledgeReviewDraft(administratorId, {
      reviewTaskId: task.id,
      expectedVersion: 1,
      proposedStatement: 'WorkMatchr-formulering voor de tijdelijke integratietest.',
      substantiveNotes: 'De inhoud is door een mens beoordeeld.',
      proposedAccessTier: 'INTERNAL_REVIEWER',
    })
    expect(saved).toMatchObject({ status: 'IN_PROGRESS', version: 2 })
    const deferred = await decideKnowledgeReview(administratorId, {
      reviewTaskId: task.id,
      expectedVersion: 2,
      operation: 'DEFER',
      proposedStatement: saved.proposedStatement,
      substantiveNotes: saved.substantiveNotes,
      deferredUntil: new Date('2027-01-01'),
    })
    expect(deferred).toMatchObject({ status: 'DEFERRED', version: 3 })
    const resumed = await saveKnowledgeReviewDraft(administratorId, {
      reviewTaskId: task.id,
      expectedVersion: 3,
      proposedStatement: saved.proposedStatement,
      substantiveNotes: saved.substantiveNotes,
    })
    expect(resumed).toMatchObject({ status: 'IN_PROGRESS', version: 4 })
    const reference = await addKnowledgeSupportingSource(administratorId, {
      reviewTaskId: task.id,
      expectedVersion: 4,
      sourceType: 'LEGISLATION',
      title: 'Actuele tijdelijke bron',
      publisher: 'Tijdelijke uitgever',
      urlOrReference: 'https://example.invalid/kennisbron',
      authorityLevel: 'PRIMARY_LEGAL',
      sourceFamily: 'tijdelijke-wetgeving',
      supportType: 'DIRECT_SUPPORT',
      isPrimary: true,
    })
    await withdrawKnowledgeSupportingSource(administratorId, { reviewTaskId: task.id, referenceId: reference.id, expectedVersion: 5 })
    const approved = await decideKnowledgeReview(administratorId, {
      reviewTaskId: task.id,
      expectedVersion: 6,
      operation: 'CONTENT_APPROVE',
      proposedStatement: saved.proposedStatement,
      substantiveNotes: saved.substantiveNotes,
      nextReviewAt: new Date('2027-01-01'),
      confirmed: true,
    })
    expect(approved).toMatchObject({ status: 'CONTENT_APPROVED', version: 7 })
    expect(await database.knowledgeClaim.findUnique({ where: { id: claim.id } })).toMatchObject({
      validationStatus: 'PARTIALLY_VALIDATED',
      publicationStatus: 'INTERNAL_REVIEW',
      sourceControlStatus: 'CONTROL_COMPLETE',
      statement: claim.statement,
    })
    expect(await database.knowledgeClaim.count({ where: { id: claim.id, publicationStatus: 'PUBLISHED' } })).toBe(0)
    const reopened = await withdrawKnowledgeReviewApproval(administratorId, {
      reviewTaskId: task.id,
      expectedVersion: 7,
      reason: 'Nieuwe broninformatie vereist een herbeoordeling.',
    })
    expect(reopened).toMatchObject({ status: 'IN_PROGRESS', version: 8 })
    expect(await database.knowledgeValidation.findMany({ where: { reviewTaskId: task.id }, orderBy: { createdAt: 'asc' } })).toMatchObject([
      { status: 'PARTIALLY_VALIDATED', withdrawsValidationId: null },
      { status: 'REVIEW_REQUIRED' },
    ])
    expect(await database.knowledgeReviewSourceReference.count({ where: { reviewTaskId: task.id } })).toBe(2)
    expect(await database.knowledgeReviewDecision.count({ where: { reviewTaskId: task.id } })).toBe(3)
  })

  it('legt wijzigingsverzoek en afwijzing zonder hard delete vast', async () => {
    const changes = await createTask('changes')
    const changed = await decideKnowledgeReview(administratorId, {
      reviewTaskId: changes.task.id, expectedVersion: 1, operation: 'CHANGES_REQUIRED',
      reason: 'De toepassing moet duidelijker worden begrensd.',
    })
    expect(changed.status).toBe('CHANGES_REQUIRED')

    const rejected = await createTask('rejected')
    const decision = await decideKnowledgeReview(administratorId, {
      reviewTaskId: rejected.task.id, expectedVersion: 1, operation: 'REJECT',
      reason: 'De historische bewering is inhoudelijk niet houdbaar.', confirmed: true,
    })
    expect(decision.status).toBe('REJECTED')
    expect(await database.knowledgeClaim.findUnique({ where: { id: rejected.claim.id } })).toMatchObject({
      validationStatus: 'REJECTED', publicationStatus: 'REJECTED', statement: rejected.claim.statement,
    })
    expect(await searchKnowledge({ query: rejected.claim.statement, accessTiers: ['INTERNAL_REVIEWER'] })).toHaveLength(0)
  })

  it('legt een professionele verbetermelding vast en heropent de broncontrole zonder kennis te muteren', async () => {
    const { task, claim } = await createTask('improvement')
    await database.knowledgeReviewTask.update({
      where: { id: task.id },
      data: { status: 'CONTENT_APPROVED', completedAt: new Date(), completedById: administratorId },
    })
    await database.knowledgeClaim.update({
      where: { id: claim.id },
      data: {
        validationStatus: 'VALIDATED',
        publicationStatus: 'PUBLISHED',
        temporalStatus: 'CURRENT',
        sourceControlStatus: 'CONTROL_COMPLETE',
        copyrightCheckPassed: true,
        reviewedByUserId: administratorId,
        reviewedAt: new Date(),
      },
    })

    const report = await reportKnowledgeImprovement(professionalUserId, {
      knowledgeItemId: claim.id,
      reportType: 'SOURCE_CHANGED',
      explanation: 'Een recentere officiële bron bevat gewijzigde inhoudelijke voorwaarden.',
      sourceReference: 'https://example.invalid/gewijzigde-bron',
    })
    expect(report).toMatchObject({ claimId: claim.id, reviewTaskId: task.id, status: 'NEW' })
    expect(await database.knowledgeReviewTask.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ status: 'CHANGES_REQUIRED' })
    expect(await database.knowledgeClaim.findUniqueOrThrow({ where: { id: claim.id } })).toMatchObject({
      statement: claim.statement,
      publicationStatus: 'PUBLISHED',
      validationStatus: 'VALIDATED',
    })
    expect(await database.knowledgeAuditEvent.count({
      where: { entityId: report.id, eventType: 'IMPROVEMENT_REPORTED' },
    })).toBe(1)

    const handled = await handleKnowledgeImprovementReport(administratorId, {
      reportId: report.id,
      expectedVersion: 1,
      status: 'PROCESSED',
      resolution: 'De melding is in de broncontrole verwerkt.',
    })
    expect(handled).toMatchObject({ status: 'PROCESSED', version: 2, handledByUserId: administratorId })
    expect(await database.knowledgeAuditEvent.count({
      where: { entityId: report.id, eventType: 'IMPROVEMENT_STATUS_CHANGED' },
    })).toBe(1)
  })

  it('audit een developmenttest en activeert exact één uitzondering zonder de claimstatus te wijzigen', async () => {
    const { task, claim } = await createTask('development-improvement')
    await database.knowledgeReviewTask.update({
      where: { id: task.id },
      data: {
        status: 'CONTENT_APPROVED',
        requiresHumanAction: false,
        deactivatedAt: new Date(),
        completedAt: new Date(),
        completedById: administratorId,
      },
    })
    vi.stubEnv('NODE_ENV', 'development')
    try {
      const report = await reportKnowledgeImprovement(professionalUserId, {
        knowledgeItemId: claim.id,
        reportType: 'INCOMPLETE',
        explanation: 'Deze interne developmenttest controleert de volledige verbetermeldflow.',
      })
      expect(await database.knowledgeReviewTask.count({
        where: {
          claimId: claim.id,
          requiresHumanAction: true,
          controlExceptionType: 'PROFESSIONAL_REPORT',
          status: { in: ['OPEN', 'IN_PROGRESS', 'DEFERRED', 'CHANGES_REQUIRED'] },
        },
      })).toBe(1)
      expect(await database.knowledgeAuditEvent.findFirstOrThrow({
        where: { entityId: report.id, eventType: 'IMPROVEMENT_REPORTED' },
      })).toMatchObject({ metadata: expect.objectContaining({ developmentTestMode: true }) })
      expect((await getKnowledgeImprovementReports('NEW')).some((item) => item.id === report.id)).toBe(true)
      expect(await database.knowledgeClaim.findUniqueOrThrow({ where: { id: claim.id } })).toMatchObject({
        publicationStatus: 'DRAFT',
        validationStatus: 'UNVALIDATED',
      })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('staat bij twee gelijktijdige beslissingen exact één goedkeuring toe', async () => {
    const { task, claim } = await createTask('concurrency')
    const input = {
      reviewTaskId: task.id,
      expectedVersion: 1,
      operation: 'CONTENT_APPROVE' as const,
      proposedStatement: 'Eén reproduceerbare WorkMatchr-formulering.',
      substantiveNotes: 'Gelijktijdige beslissingstest.',
      confirmed: true,
    }
    const results = await Promise.allSettled([
      decideKnowledgeReview(administratorId, input),
      decideKnowledgeReview(administratorId, input),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(await database.knowledgeValidation.count({ where: { claimId: claim.id, status: 'PARTIALLY_VALIDATED' } })).toBe(1)
    expect(await database.knowledgeReviewDecision.count({ where: { reviewTaskId: task.id, decisionType: 'CONTENT_APPROVED' } })).toBe(1)
    expect(await database.knowledgeClaim.count({ where: { id: claim.id, publicationStatus: 'PUBLISHED' } })).toBe(0)
  })

  it('beschermt beslissingen, bronreferenties, validaties en audit tegen mutatie', async () => {
    const decision = await database.knowledgeReviewDecision.findFirstOrThrow()
    const reference = await database.knowledgeReviewSourceReference.findFirstOrThrow()
    const validation = await database.knowledgeValidation.findFirstOrThrow()
    const audit = await database.knowledgeAuditEvent.findFirstOrThrow({ where: { entityType: 'KnowledgeReviewTask' } })
    for (const [table, id] of [['KnowledgeReviewDecision', decision.id], ['KnowledgeReviewSourceReference', reference.id], ['KnowledgeValidation', validation.id], ['KnowledgeAuditEvent', audit.id]]) {
      await expect(database.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id"=$1::uuid`, id)).rejects.toThrow()
    }
  })

  it('schrijft de afgesproken veilige auditevents zonder kennisinhoud in metadata', async () => {
    const events = await database.knowledgeAuditEvent.findMany({ where: { entityType: 'KnowledgeReviewTask' } })
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining([
      'REVIEW_STARTED', 'REVIEW_DRAFT_SAVED', 'REVIEW_DEFERRED', 'CLAIM_REWORDING_PROPOSED',
      'CHANGES_REQUIRED', 'CONTENT_REVIEW_APPROVED', 'CONTENT_REVIEW_REJECTED',
      'VALIDATION_WITHDRAWN', 'SUPPORTING_SOURCE_ADDED', 'SUPPORTING_SOURCE_REMOVED', 'REVIEW_REOPENED',
    ]))
    expect(JSON.stringify(events.map((event) => event.metadata))).not.toContain('WorkMatchr-formulering')
  })
})
