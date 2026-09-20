import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { allocateDossierCode, type AdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-service'
import { PROFESSIONAL_ADVICE_DISCLAIMER } from '@/lib/guidance/professional-advice-rules'
import { simpleAdviceSchema, usesLocation } from './simple-advice-contract'
import { publishRequestAttempt, RequestServiceError, isPrismaConflict } from './request-service'
import { z } from 'zod'

export async function publishSimpleAdviceRequest(viewer: AdviceDossierViewer, submissionId: string, raw: unknown) {
  const id = z.string().uuid().parse(submissionId)
  const value = simpleAdviceSchema.parse(raw)
  const at = new Date()
  if (!viewer.organizationId) throw new RequestServiceError('ACCESS_DENIED')
  let failureStage = 'PUBLICATION_TRANSACTION'
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getPrisma().$transaction(async transaction => {
        failureStage = 'IDENTITY_VALIDATION'
        // Re-read active identity and tenant inside the same transaction as publication.
        const membership = await transaction.organizationMembership.findUnique({ where: { userId: viewer.userId } })
        const user = membership ? await transaction.user.findUnique({ where: { id: membership.userId }, select: { status: true, accountType: true } }) : null
        const organization = membership ? await transaction.organization.findUnique({ where: { id: membership.organizationId }, select: { status: true, organizationType: true } }) : null
        if (!membership || membership.organizationId !== viewer.organizationId || membership.status !== 'ACTIVE' || user?.status !== 'ACTIVE' || user.accountType !== 'CLIENT' || organization?.status !== 'ACTIVE' || organization.organizationType !== 'CLIENT') throw new RequestServiceError('ACCESS_DENIED')
        await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))::text`)
        const existing = await transaction.adviceDossier.findUnique({ where: { id } })
        const existingVersion = existing ? await transaction.adviceDossierVersion.findFirst({ where: { adviceDossierId: id, versionNumber: 1 } }) : null
        if (existing) {
          if (existing.ownerUserId !== viewer.userId || existing.organizationId !== viewer.organizationId) throw new RequestServiceError('NOT_FOUND')
          const saved = simpleAdviceSchema.safeParse(existingVersion?.simpleRequestSnapshot)
          if (!saved.success || JSON.stringify(saved.data) !== JSON.stringify(value)) throw new RequestServiceError('CONFLICT')
        } else {
          if (usesLocation(value, 'ORGANIZATION') && (value.organizationLocationId || !value.organizationLocationCity)) {
            const location = await transaction.organizationLocation.findFirst({ where: { organizationId: viewer.organizationId!, archivedAt: null, ...(value.organizationLocationId ? { id: value.organizationLocationId } : {}) } })
            if (!location) throw new RequestServiceError('NOT_ELIGIBLE')
          }
          const code = await allocateDossierCode(transaction, at.getUTCFullYear())
          await transaction.adviceDossier.create({ data: { id, dossierCode: code, ownerUserId: viewer.userId,
            organizationId: viewer.organizationId!, sourceRoute: 'SIMPLE_ADVICE',
            subject: value.requestTitle, status: 'COMPLETED', completedAt: at,
            versions: { create: { versionNumber: 1, simpleRequestSnapshot: value as Prisma.InputJsonValue,
              originalHelpRequest: value.requestDescription, situationSummary: value.requestDescription, subject: value.requestTitle,
              adviceTitle: 'Uw opdracht', adviceBody: 'Deze opdracht bevat de door u ingevulde gegevens.',
              adviceReasons: ['Uw eigen keuze is vastgelegd.'], selfActions: ['Bespreek de aanpak en planning met de professional.'],
              additionalProfessionalRequirementsSnapshot: [], knowledgeReferencesSnapshot: [], sourceReferencesSnapshot: [], uncertaintiesSnapshot: [],
              disclaimer: PROFESSIONAL_ADVICE_DISCLAIMER, outcomeSpecificity: 'SPECIFIC', completionStatus: 'COMPLETED_WITH_USER_INPUT',
            } },
          } })
          await transaction.adviceDossierEvent.createMany({ data: (['DOSSIER_CREATED', 'VERSION_CREATED'] as const).map(type => ({
            adviceDossierId: id, actorUserId: viewer.userId, type, versionNumber: 1, idempotencyKey: `simple-advice:${id}:${type}`, occurredAt: at,
          })) })
        }
        failureStage = 'REQUEST_ASSIGNMENT_HANDOFF'
        return publishRequestAttempt({ transaction, viewer, at, publication: { adviceDossierId: id,
          publicSummary: value.requestDescription, requestedStart: value.desiredStartMode === 'AS_SOON_AS_POSSIBLE' ? 'AS_SOON_AS_POSSIBLE' : value.desiredStartMode === 'WITHIN_ONE_MONTH' ? 'WITHIN_ONE_MONTH' : 'IN_CONSULTATION', notes: '' } })
      }, { isolationLevel: 'Serializable' })
    } catch (error) {
      if (error instanceof RequestServiceError) throw error
      if (!isPrismaConflict(error) || attempt === 2) {
        const rawCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : null
        console.error(JSON.stringify({ event: 'simple_advice_publication_failed', stage: failureStage,
          exceptionType: error instanceof Error ? error.name : typeof error,
          exceptionCode: rawCode && /^[A-Z0-9_]{1,64}$/.test(rawCode) ? rawCode : null,
          correlationId: id }))
        throw error
      }
    }
  }
  throw new RequestServiceError('CONFLICT')
}
