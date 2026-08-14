import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type {
  AdviceDossierStatus,
  OrganizationMembershipRole,
  Prisma,
} from '@/generated/prisma/client'
import { Prisma as PrismaNamespace } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import { getAIIntakeUnderstanding } from '@/lib/public-intake/public-intake-ai-presentation'
import { presentPublicIntakeGuidance } from '@/lib/public-intake/public-intake-guidance-presentation'
import { summarizeConfirmedContext } from '@/lib/guidance/confirmed-context'
import {
  adviceDossierSnapshotSchema,
  professionalRequirementSnapshotSchema,
  secondaryProfessionalRequirementSnapshotSchema,
  type AdviceDossierReference,
  type AdviceDossierSnapshot,
} from './advice-dossier-contract'

type Transaction = Prisma.TransactionClient

export class AdviceDossierError extends Error {
  constructor(
    public readonly code:
      | 'NOT_ELIGIBLE'
      | 'ACCESS_DENIED'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'INVALID_STATUS',
  ) {
    super(code)
    this.name = 'AdviceDossierError'
  }
}

export type AdviceDossierViewer = Readonly<{
  userId: string
  organizationId: string | null
  organizationRole: OrganizationMembershipRole | null
  isPlatformAdministrator?: boolean
}>

const subjectLabels: Readonly<Record<string, string>> = Object.freeze({
  RIE: 'Risico-inventarisatie en -evaluatie',
  INCIDENT: 'Incident of ongeval',
  HAZARDOUS_SUBSTANCES: 'Gevaarlijke stoffen of brandstof',
  OCCUPATIONAL_HEALTH: 'Gezondheid en fysieke belasting',
  EMERGENCY_RESPONSE: 'Bedrijfshulpverlening',
})

function isPrismaConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false
  }
  if (error.code === 'P2002' || error.code === 'P2034') return true
  const serialized = JSON.stringify(error)
  if (
    (error instanceof Error && error.message.includes('40001')) ||
    serialized.includes('40001')
  ) {
    return true
  }
  if (
    error.code === 'P2010' &&
    'meta' in error &&
    error.meta &&
    typeof error.meta === 'object' &&
    'code' in error.meta
  ) {
    return error.meta.code === '40001'
  }
  return false
}

function canReadDossier(
  viewer: AdviceDossierViewer,
  dossier: { ownerUserId: string; organizationId: string },
): boolean {
  if (viewer.isPlatformAdministrator) return true
  if (dossier.ownerUserId === viewer.userId) return true
  return (
    viewer.organizationId === dossier.organizationId &&
    (viewer.organizationRole === 'OWNER' ||
      viewer.organizationRole === 'ADMIN')
  )
}

function canMutateDossier(
  viewer: AdviceDossierViewer,
  dossier: { ownerUserId: string; organizationId: string },
): boolean {
  if (dossier.ownerUserId === viewer.userId) return true
  return (
    viewer.organizationId === dossier.organizationId &&
    (viewer.organizationRole === 'OWNER' ||
      viewer.organizationRole === 'ADMIN')
  )
}

function originalHelpRequest(draft: PublicIntakeDraftView): string {
  const outcome = draft.guidance.outcome
  if (!outcome) throw new AdviceDossierError('NOT_ELIGIBLE')

  return (
    draft.originalInput ??
    outcome.helpRequest.originalInput
  )
}

export function resolveAdviceDossierSituationSummary(
  draft: PublicIntakeDraftView,
): string {
  const outcome = draft.guidance.outcome
  if (!outcome) throw new AdviceDossierError('NOT_ELIGIBLE')

  const confirmedTopic = draft.answers.find(
    (answer) =>
      answer.questionKey === 'guidance_topic' &&
      answer.disposition === 'ANSWERED' &&
      answer.source === 'AI_CONFIRMED',
  )
  const understanding = getAIIntakeUnderstanding(draft.aiClassification)
  const baseSummary =
    confirmedTopic &&
    understanding &&
    confirmedTopic.value === understanding.subjectCode
      ? understanding.summary
      : outcome.helpRequest.confirmedDescription?.trim() ||
        presentPublicIntakeGuidance(outcome).situationSummary.trim() ||
        outcome.summary.trim() ||
        originalHelpRequest(draft)

  return summarizeConfirmedContext(baseSummary, outcome.facts)
}

export function buildAdviceDossierSnapshot(
  draft: PublicIntakeDraftView,
): AdviceDossierSnapshot {
  const outcome = draft.guidance.outcome
  const completionStatus = draft.guidance.completion.status
  if (
    !outcome ||
    (completionStatus !== 'COMPLETED_WITH_GUIDANCE' &&
      completionStatus !== 'COMPLETED_WITH_SAFE_FALLBACK')
  ) {
    throw new AdviceDossierError('NOT_ELIGIBLE')
  }

  const presentation = presentPublicIntakeGuidance(outcome)
  return adviceDossierSnapshotSchema.parse({
    originalHelpRequest: originalHelpRequest(draft),
    situationSummary: resolveAdviceDossierSituationSummary(draft),
    subject:
      subjectLabels[draft.guidance.contract.situation.code] ??
      'Uw hulpvraag',
    adviceTitle: presentation.adviceTitle,
    adviceBody: presentation.adviceBody,
    adviceReasons: presentation.adviceReasons,
    selfActions: presentation.selfActions,
    primaryProfessionalRequirement:
      presentation.primaryProfessionalRequirement,
    additionalProfessionalRequirements:
      presentation.additionalProfessionalRequirements,
    possibleProfessionalRequirements:
      presentation.possibleProfessionalRequirements,
    knowledgeReferences: presentation.knowledgeReferences,
    sourceReferences: presentation.sourceReferences,
    uncertainties: presentation.uncertainties,
    disclaimer: presentation.disclaimer,
    outcomeSpecificity: outcome.professionalAdvice.outcomeSpecificity,
    completionStatus,
  })
}

async function allocateDossierCode(
  transaction: Transaction,
  year: number,
): Promise<string> {
  await transaction.$queryRaw(
    PrismaNamespace.sql`
      SELECT pg_advisory_xact_lock(87321, ${year})::text AS "lock"
    `,
  )
  const rows = await transaction.$queryRaw<Array<{ nextNumber: number }>>(
    PrismaNamespace.sql`
      INSERT INTO "AdviceDossierCounter" ("year", "nextNumber", "updatedAt")
      VALUES (${year}, 1, NOW())
      ON CONFLICT ("year") DO UPDATE
      SET "nextNumber" = "AdviceDossierCounter"."nextNumber" + 1,
          "updatedAt" = NOW()
      RETURNING "nextNumber"
    `,
  )
  const allocated = rows[0]?.nextNumber
  if (!allocated) throw new AdviceDossierError('CONFLICT')
  return `WM-${year}-${String(allocated).padStart(6, '0')}`
}

function versionData(
  dossierId: string,
  draftId: string,
  sourceDraftVersion: number,
  versionNumber: number,
  snapshot: AdviceDossierSnapshot,
) {
  return {
    adviceDossierId: dossierId,
    versionNumber,
    sourcePublicIntakeDraftId: draftId,
    sourceDraftVersion,
    originalHelpRequest: snapshot.originalHelpRequest,
    situationSummary: snapshot.situationSummary,
    subject: snapshot.subject,
    adviceTitle: snapshot.adviceTitle,
    adviceBody: snapshot.adviceBody,
    adviceReasons: snapshot.adviceReasons,
    selfActions: snapshot.selfActions,
    primaryProfessionalRequirementSnapshot:
      snapshot.primaryProfessionalRequirement ??
      PrismaNamespace.JsonNull,
    additionalProfessionalRequirementsSnapshot:
      [
        ...snapshot.additionalProfessionalRequirements,
        ...snapshot.possibleProfessionalRequirements,
      ],
    knowledgeReferencesSnapshot: snapshot.knowledgeReferences,
    sourceReferencesSnapshot: snapshot.sourceReferences,
    uncertaintiesSnapshot: snapshot.uncertainties,
    disclaimer: snapshot.disclaimer,
    outcomeSpecificity: snapshot.outcomeSpecificity,
    completionStatus: snapshot.completionStatus,
  } satisfies Prisma.AdviceDossierVersionUncheckedCreateInput
}

async function createDossierAttempt(input: {
  draft: PublicIntakeDraftView
  ownerUserId: string
  organizationId: string
  at: Date
}): Promise<AdviceDossierReference> {
  const draftId = input.draft.id
  if (!draftId) throw new AdviceDossierError('NOT_ELIGIBLE')
  const snapshot = buildAdviceDossierSnapshot(input.draft)

  return getPrisma().$transaction(
    async (transaction) => {
      await transaction.$queryRaw(
        PrismaNamespace.sql`
          SELECT "id"
          FROM "PublicIntakeDraft"
          WHERE "id" = ${draftId}::uuid
          FOR UPDATE
        `,
      )
      const existing = await transaction.adviceDossier.findUnique({
        where: { sourcePublicIntakeDraftId: draftId },
        select: {
          id: true,
          dossierCode: true,
          ownerUserId: true,
          organizationId: true,
        },
      })
      if (existing) {
        if (
          existing.ownerUserId !== input.ownerUserId ||
          existing.organizationId !== input.organizationId
        ) {
          throw new AdviceDossierError('ACCESS_DENIED')
        }
        return { id: existing.id, dossierCode: existing.dossierCode }
      }

      const sourceDraft = await transaction.publicIntakeDraft.findUnique({
        where: { id: draftId },
        select: { id: true, version: true },
      })
      const membership =
        await transaction.organizationMembership.findUnique({
          where: { userId: input.ownerUserId },
          select: {
            organizationId: true,
            status: true,
            user: { select: { accountType: true } },
            organization: {
              select: { status: true, organizationType: true },
            },
          },
        })
      if (
        !sourceDraft ||
        sourceDraft.version !== input.draft.version ||
        !membership ||
        membership.organizationId !== input.organizationId ||
        membership.status !== 'ACTIVE' ||
        membership.organization.status !== 'ACTIVE' ||
        membership.user.accountType !== 'CLIENT' ||
        membership.organization.organizationType !== 'CLIENT'
      ) {
        throw new AdviceDossierError('ACCESS_DENIED')
      }

      const dossierCode = await allocateDossierCode(
        transaction,
        input.at.getUTCFullYear(),
      )
      const dossier = await transaction.adviceDossier.create({
        data: {
          dossierCode,
          ownerUserId: input.ownerUserId,
          organizationId: input.organizationId,
          sourceRoute: 'HELP_REQUEST',
          sourcePublicIntakeDraftId: draftId,
          subject: snapshot.subject,
          status: 'ADVICE_READY',
          currentVersionNumber: 1,
          completedAt: input.at,
          createdAt: input.at,
        },
        select: { id: true, dossierCode: true },
      })
      await transaction.adviceDossierVersion.create({
        data: versionData(
          dossier.id,
          draftId,
          input.draft.version,
          1,
          snapshot,
        ),
      })
      await transaction.adviceDossierEvent.createMany({
        data: [
          {
            adviceDossierId: dossier.id,
            actorUserId: input.ownerUserId,
            type: 'DOSSIER_CREATED',
            versionNumber: 1,
            idempotencyKey: `advice-dossier:${dossier.id}:created`,
            occurredAt: input.at,
          },
          {
            adviceDossierId: dossier.id,
            actorUserId: input.ownerUserId,
            type: 'VERSION_CREATED',
            versionNumber: 1,
            idempotencyKey: `advice-dossier:${dossier.id}:version:1`,
            occurredAt: input.at,
          },
        ],
      })
      return dossier
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function ensureAdviceDossierForCompletedPublicIntake(input: {
  draft: PublicIntakeDraftView
  ownerUserId: string
  organizationId: string
  at?: Date
}): Promise<AdviceDossierReference> {
  const at = input.at ?? new Date()
  if (!input.draft.id) throw new AdviceDossierError('NOT_ELIGIBLE')
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createDossierAttempt({ ...input, at })
    } catch (error) {
      if (error instanceof AdviceDossierError) throw error
      if (!isPrismaConflict(error)) throw error
    }

    const existing = await getPrisma().adviceDossier.findUnique({
      where: { sourcePublicIntakeDraftId: input.draft.id },
      select: {
        id: true,
        dossierCode: true,
        ownerUserId: true,
        organizationId: true,
      },
    })
    if (existing) {
      if (
        existing.ownerUserId !== input.ownerUserId ||
        existing.organizationId !== input.organizationId
      ) {
        throw new AdviceDossierError('ACCESS_DENIED')
      }
      return { id: existing.id, dossierCode: existing.dossierCode }
    }
  }
  throw new AdviceDossierError('CONFLICT')
}

const dossierListSelect = {
  id: true,
  dossierCode: true,
  subject: true,
  status: true,
  currentVersionNumber: true,
  createdAt: true,
  versions: {
    orderBy: { versionNumber: 'desc' as const },
    take: 1,
    select: {
      primaryProfessionalRequirementSnapshot: true,
    },
  },
} satisfies Prisma.AdviceDossierSelect

export async function listAdviceDossiers(
  viewer: AdviceDossierViewer,
) {
  if (!viewer.organizationId && !viewer.isPlatformAdministrator) {
    return []
  }
  const organizationWide =
    viewer.isPlatformAdministrator ||
    viewer.organizationRole === 'OWNER' ||
    viewer.organizationRole === 'ADMIN'
  const dossiers = await getPrisma().adviceDossier.findMany({
    where: viewer.isPlatformAdministrator
      ? {}
      : organizationWide
        ? { organizationId: viewer.organizationId! }
        : {
            organizationId: viewer.organizationId!,
            ownerUserId: viewer.userId,
          },
    orderBy: { createdAt: 'desc' },
    select: dossierListSelect,
  })
  return dossiers.map((dossier) => {
    const parsed = professionalRequirementSnapshotSchema.safeParse(
      dossier.versions[0]?.primaryProfessionalRequirementSnapshot,
    )
    return {
      id: dossier.id,
      dossierCode: dossier.dossierCode,
      subject: dossier.subject,
      status: dossier.status,
      currentVersionNumber: dossier.currentVersionNumber,
      createdAt: dossier.createdAt,
      primaryProfessionalLabel: parsed.success
        ? parsed.data.label
        : null,
    }
  })
}

const dossierDetailInclude = {
  versions: {
    orderBy: { versionNumber: 'desc' as const },
    take: 1,
  },
  request: {
    select: {
      id: true,
      requestNumber: true,
      status: true,
    },
  },
} satisfies Prisma.AdviceDossierInclude

export async function getAdviceDossier(
  viewer: AdviceDossierViewer,
  dossierId: string,
) {
  const dossier = await getPrisma().adviceDossier.findUnique({
    where: { id: dossierId },
    include: dossierDetailInclude,
  })
  if (!dossier || !canReadDossier(viewer, dossier)) {
    throw new AdviceDossierError('NOT_FOUND')
  }
  const version = dossier.versions[0]
  if (!version || version.versionNumber !== dossier.currentVersionNumber) {
    throw new AdviceDossierError('CONFLICT')
  }
  const secondaryRequirements = z
    .array(secondaryProfessionalRequirementSnapshotSchema)
    .parse(version.additionalProfessionalRequirementsSnapshot)
  return {
    ...dossier,
    currentVersion: {
      ...version,
      snapshot: adviceDossierSnapshotSchema.parse({
        originalHelpRequest: version.originalHelpRequest,
        situationSummary: version.situationSummary,
        subject: version.subject,
        adviceTitle: version.adviceTitle,
        adviceBody: version.adviceBody,
        adviceReasons: version.adviceReasons,
        selfActions: version.selfActions,
        primaryProfessionalRequirement:
          version.primaryProfessionalRequirementSnapshot,
        additionalProfessionalRequirements:
          secondaryRequirements.filter(
            (requirement) => requirement.priority === 'ADDITIONAL',
          ),
        possibleProfessionalRequirements:
          secondaryRequirements.filter(
            (requirement) => requirement.priority === 'POSSIBLE',
          ),
        knowledgeReferences: version.knowledgeReferencesSnapshot,
        sourceReferences: version.sourceReferencesSnapshot,
        uncertainties: version.uncertaintiesSnapshot,
        disclaimer: version.disclaimer,
        outcomeSpecificity: version.outcomeSpecificity,
        completionStatus: version.completionStatus,
      }),
    },
  }
}

export async function appendAdviceDossierVersion(input: {
  viewer: AdviceDossierViewer
  dossierId: string
  draft: PublicIntakeDraftView
  at?: Date
}) {
  if (!input.draft.id) throw new AdviceDossierError('NOT_ELIGIBLE')
  const snapshot = buildAdviceDossierSnapshot(input.draft)
  const at = input.at ?? new Date()
  return getPrisma().$transaction(
    async (transaction) => {
      const dossier = await transaction.adviceDossier.findUnique({
        where: { id: input.dossierId },
      })
      if (!dossier || !canMutateDossier(input.viewer, dossier)) {
        throw new AdviceDossierError('NOT_FOUND')
      }
      const existing = await transaction.adviceDossierVersion.findUnique({
        where: {
          sourcePublicIntakeDraftId_sourceDraftVersion: {
            sourcePublicIntakeDraftId: input.draft.id!,
            sourceDraftVersion: input.draft.version,
          },
        },
      })
      if (existing) return existing
      const nextVersion = dossier.currentVersionNumber + 1
      const version = await transaction.adviceDossierVersion.create({
        data: versionData(
          dossier.id,
          input.draft.id!,
          input.draft.version,
          nextVersion,
          snapshot,
        ),
      })
      const updated = await transaction.adviceDossier.updateMany({
        where: {
          id: dossier.id,
          currentVersionNumber: dossier.currentVersionNumber,
        },
        data: {
          currentVersionNumber: nextVersion,
          subject: snapshot.subject,
        },
      })
      if (updated.count !== 1) throw new AdviceDossierError('CONFLICT')
      await transaction.adviceDossierEvent.create({
        data: {
          adviceDossierId: dossier.id,
          actorUserId: input.viewer.userId,
          type: 'VERSION_CREATED',
          versionNumber: nextVersion,
          idempotencyKey: `advice-dossier:${dossier.id}:version:${nextVersion}`,
          occurredAt: at,
        },
      })
      return version
    },
    { isolationLevel: 'Serializable' },
  )
}

const allowedStatusTransitions: Readonly<
  Record<AdviceDossierStatus, readonly AdviceDossierStatus[]>
> = {
  DRAFT: ['ADVICE_READY'],
  ADVICE_READY: ['COMPLETED', 'ARCHIVED'],
  SPECIALIST_SEARCHED: ['ASSIGNMENT_STARTED', 'ARCHIVED'],
  ASSIGNMENT_STARTED: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
}

export async function changeAdviceDossierStatus(input: {
  viewer: AdviceDossierViewer
  dossierId: string
  toStatus: AdviceDossierStatus
  at?: Date
}) {
  const at = input.at ?? new Date()
  return getPrisma().$transaction(
    async (transaction) => {
      const dossier = await transaction.adviceDossier.findUnique({
        where: { id: input.dossierId },
      })
      if (!dossier || !canMutateDossier(input.viewer, dossier)) {
        throw new AdviceDossierError('NOT_FOUND')
      }
      if (!allowedStatusTransitions[dossier.status].includes(input.toStatus)) {
        throw new AdviceDossierError('INVALID_STATUS')
      }
      const updated = await transaction.adviceDossier.update({
        where: { id: dossier.id },
        data: {
          status: input.toStatus,
          ...(input.toStatus === 'COMPLETED'
            ? { completedAt: at }
            : {}),
          ...(input.toStatus === 'ARCHIVED'
            ? { archivedAt: at }
            : {}),
        },
      })
      await transaction.adviceDossierEvent.create({
        data: {
          adviceDossierId: dossier.id,
          actorUserId: input.viewer.userId,
          type: 'STATUS_CHANGED',
          fromStatus: dossier.status,
          toStatus: input.toStatus,
          versionNumber: dossier.currentVersionNumber,
          idempotencyKey: `advice-dossier:${dossier.id}:status:${dossier.status}:${input.toStatus}`,
          occurredAt: at,
        },
      })
      return updated
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function recordAdviceDossierPdfDownload(input: {
  viewer: AdviceDossierViewer
  dossierId: string
  versionNumber: number
  at?: Date
}) {
  const dossier = await getPrisma().adviceDossier.findUnique({
    where: { id: input.dossierId },
    select: { id: true, ownerUserId: true, organizationId: true },
  })
  if (!dossier || !canReadDossier(input.viewer, dossier)) {
    throw new AdviceDossierError('NOT_FOUND')
  }
  await getPrisma().adviceDossierEvent.create({
    data: {
      adviceDossierId: dossier.id,
      actorUserId: input.viewer.userId,
      type: 'PDF_DOWNLOADED',
      versionNumber: input.versionNumber,
      idempotencyKey: `advice-dossier:${dossier.id}:pdf:${randomUUID()}`,
      occurredAt: input.at ?? new Date(),
    },
  })
}
