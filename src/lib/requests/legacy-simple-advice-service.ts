import { Prisma } from '@/generated/prisma/client'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireIntakeViewer } from '@/lib/intakes/intake-authorization'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'
import { allocateDossierCode, type AdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-service'
import { PROFESSIONAL_ADVICE_DISCLAIMER } from '@/lib/guidance/professional-advice-rules'
import { legacySimpleAdvicePrefill } from './legacy-simple-advice-prefill'
import { simpleAdviceSchema, usesLocation } from './simple-advice-contract'
import { publishRequestAttempt, RequestServiceError } from './request-service'
import { expertiseSpecialismSlugs } from './expertise-specialism-reference'

const keys = ['routeChoice', 'requestedExpertise', 'helpTopic', 'helpTopicOther', 'requestTitle', 'requestDescription', 'desiredOutcome', 'desiredOutcomeOther', 'workLocationMode', 'organizationLocationId', 'organizationLocationCity', 'otherLocationCity', 'desiredStartMode', 'desiredStartDate']
const draftSchema = z.object({
  ...Object.fromEntries(keys.map(key => [key, z.string().max(key === 'requestDescription' ? 4000 : 500).nullable().optional()])),
  additionalExpertises: z.array(z.string().max(60)).max(2).optional(),
  organizationLocationId: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  combinationModes: z.array(z.enum(['ORGANIZATION', 'OTHER_LOCATION', 'REMOTE'])).max(3).optional(),
}).strict()

async function source(tx: Prisma.TransactionClient, viewer: AdviceDossierViewer, intakeId: string) {
  await requireIntakeViewer(tx, viewer.userId, intakeId)
  const intake = await tx.intake.findUniqueOrThrow({ where: { id: intakeId }, include: {
    assignment: { include: { primarySpecialism: true } }, adviceDossierHandoff: { include: { adviceDossier: { include: { request: true } } } },
    simpleAdviceRevisions: { orderBy: { version: 'desc' }, take: 1 },
  } })
  if (intake.clientOrganizationId !== viewer.organizationId) throw new RequestServiceError('ACCESS_DENIED')
  const dossierId = intake.adviceDossierHandoff?.adviceDossierId ?? intake.id
  const published = await tx.request.findUnique({ where: { adviceDossierId: dossierId }, select: { id: true } })
  return { intake, dossierId, published }
}

function assertEditable(value: Awaited<ReturnType<typeof source>>) {
  if (value.published || value.intake.archivedAt || value.intake.assignment?.publishedAt ||
      (value.intake.assignment && !['DRAFT', 'READY_FOR_REVIEW'].includes(value.intake.assignment.status)) ||
      !['DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'CONVERTED'].includes(value.intake.status)) throw new RequestServiceError('NOT_ELIGIBLE')
}

export async function getLegacySimpleAdvice(viewer: AdviceDossierViewer, intakeId: string) {
  const data = await getPrisma().$transaction(tx => source(tx, viewer, intakeId))
  if (data.published) return { publishedRequestId: data.published.id } as const
  if (data.intake.assignment?.publishedAt) return { historicalAssignmentId: data.intake.assignment.id } as const
  assertEditable(data)
  const detail = await getIntakeDetail(viewer.userId, intakeId)
  const revision = data.intake.simpleAdviceRevisions[0]
  const locations = await getPrisma().organizationLocation.findMany({ where: { organizationId: viewer.organizationId!, archivedAt: null }, select: { id: true, city: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] })
  const assignment = data.intake.assignment
  const primary = Object.entries(expertiseSpecialismSlugs).find(([, slug]) => slug === assignment?.primarySpecialism?.slug)?.[0]
  const assignmentValues = assignment ? {
    requestDescription: assignment.description,
    ...(primary ? { routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: primary, additionalExpertises: [] } : {}),
    ...(assignment.desiredStartDate ? { desiredStartMode: 'SPECIFIC_DATE', desiredStartDate: assignment.desiredStartDate.toISOString().slice(0, 10) } : {}),
    ...(assignment.locationType === 'REMOTE' ? { workLocationMode: 'REMOTE' } : assignment.locationId ? { workLocationMode: 'ORGANIZATION', organizationLocationId: assignment.locationId } : assignment.locationCity ? { workLocationMode: 'OTHER_LOCATION', otherLocationCity: assignment.locationCity } : {}),
  } : {}
  return { initialValues: revision ? revision.payload as Record<string, unknown> : { ...legacySimpleAdvicePrefill(detail), ...assignmentValues }, version: revision?.version ?? 0, locations } as const
}

export async function saveLegacySimpleAdvice(viewer: AdviceDossierViewer, intakeId: string, expectedVersion: number, raw: unknown) {
  const payload = draftSchema.parse(raw)
  return getPrisma().$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Intake" WHERE id=${intakeId}::uuid FOR UPDATE`)
    const data = await source(tx, viewer, intakeId)
    assertEditable(data)
    const version = data.intake.simpleAdviceRevisions[0]?.version ?? 0
    if (version !== expectedVersion) throw new RequestServiceError('CONFLICT')
    if (usesLocation({ workLocationMode: String((payload as Record<string, unknown>).workLocationMode ?? ''), combinationModes: payload.combinationModes ?? [] }, 'ORGANIZATION') && payload.organizationLocationId && !await tx.organizationLocation.findFirst({ where: { id: payload.organizationLocationId, organizationId: viewer.organizationId!, archivedAt: null } })) throw new RequestServiceError('ACCESS_DENIED')
    await tx.intakeSimpleAdviceRevision.create({ data: { intakeId, version: version + 1, payload: payload as Prisma.InputJsonValue, actorUserId: viewer.userId } })
    return version + 1
  }, { isolationLevel: 'Serializable' })
}

export async function publishLegacySimpleAdvice(viewer: AdviceDossierViewer, intakeId: string, expectedVersion: number, raw: unknown) {
  const value = simpleAdviceSchema.parse(raw)
  const at = new Date()
  return getPrisma().$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Intake" WHERE id=${intakeId}::uuid FOR UPDATE`)
    const data = await source(tx, viewer, intakeId)
    if (data.published) {
      const request = await tx.request.findUniqueOrThrow({ where: { id: data.published.id }, include: { adviceDossierVersion: true } })
      if (JSON.stringify(simpleAdviceSchema.parse(request.adviceDossierVersion?.simpleRequestSnapshot)) !== JSON.stringify(value)) throw new RequestServiceError('CONFLICT')
      return { id: request.id }
    }
    assertEditable(data)
    if ((data.intake.simpleAdviceRevisions[0]?.version ?? 0) !== expectedVersion) throw new RequestServiceError('CONFLICT')
    const previous = await tx.adviceDossier.findUnique({ where: { id: data.dossierId } })
    if (previous && (previous.ownerUserId !== viewer.userId || previous.organizationId !== viewer.organizationId)) throw new RequestServiceError('ACCESS_DENIED')
    const versionNumber = previous ? previous.currentVersionNumber + 1 : 1
    const version = {
      versionNumber, simpleRequestSnapshot: value as Prisma.InputJsonValue,
      originalHelpRequest: data.intake.freeText, situationSummary: value.requestDescription, subject: value.requestTitle,
      adviceTitle: 'Uw opdracht', adviceBody: 'Deze opdracht bevat de door u ingevulde gegevens.',
      adviceReasons: ['Uw eigen keuze is vastgelegd.'], selfActions: ['Bespreek de aanpak en planning met de professional.'],
      additionalProfessionalRequirementsSnapshot: [], knowledgeReferencesSnapshot: [],
      sourceReferencesSnapshot: [{ sourceIntakeId: intakeId, sourceIntakeVersion: data.intake.version, simpleAdviceRevision: expectedVersion }],
      uncertaintiesSnapshot: [], disclaimer: PROFESSIONAL_ADVICE_DISCLAIMER,
      outcomeSpecificity: 'SPECIFIC', completionStatus: 'COMPLETED_WITH_USER_INPUT',
    }
    if (previous) await tx.adviceDossier.update({ where: { id: previous.id }, data: { currentVersionNumber: versionNumber, subject: value.requestTitle, status: 'COMPLETED', completedAt: at, versions: { create: version } } })
    else await tx.adviceDossier.create({ data: { id: data.dossierId, dossierCode: await allocateDossierCode(tx, at.getUTCFullYear()), ownerUserId: viewer.userId, organizationId: viewer.organizationId!, sourceRoute: 'SIMPLE_ADVICE', subject: value.requestTitle, status: 'COMPLETED', completedAt: at, versions: { create: version } } })
    if (!previous) await tx.adviceDossierEvent.create({ data: { adviceDossierId: data.dossierId, actorUserId: viewer.userId, type: 'DOSSIER_CREATED', versionNumber, idempotencyKey: `legacy-simple:${intakeId}:created`, occurredAt: at } })
    await tx.adviceDossierEvent.create({ data: { adviceDossierId: data.dossierId, actorUserId: viewer.userId, type: 'VERSION_CREATED', versionNumber, idempotencyKey: `legacy-simple:${intakeId}:${versionNumber}`, occurredAt: at } })
    const request = await publishRequestAttempt({ transaction: tx, viewer, at, legacyIntakeId: intakeId,
      publication: { adviceDossierId: data.dossierId, publicSummary: value.requestDescription, requestedStart: 'IN_CONSULTATION', notes: '' } })
    await tx.intake.update({ where: { id: intakeId }, data: { status: 'CONVERTED', submittedAt: data.intake.submittedAt ?? at, submittedByUserId: data.intake.submittedByUserId ?? viewer.userId, convertedAt: data.intake.convertedAt ?? at, version: { increment: 1 } } })
    await tx.intakeStatusHistory.create({ data: { intakeId, fromStatus: data.intake.status, toStatus: 'CONVERTED', changedByUserId: viewer.userId, createdAt: at } })
    return request
  }, { isolationLevel: 'Serializable', timeout: 20000 })
}
