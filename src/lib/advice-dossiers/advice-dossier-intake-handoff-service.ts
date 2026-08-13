import { Prisma as PrismaNamespace } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireIntakeCreator } from '@/lib/intakes/intake-authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { normalizeIntakeAnswer } from '@/lib/intakes/intake-validation'
import type { AdviceDossierViewer } from './advice-dossier-service'

const QUESTIONNAIRE_SLUG = 'client-occupational-health-and-safety'
const INITIAL_QUESTION_KEY = 'HELP_REQUEST_DESCRIPTION'

export class AdviceDossierIntakeHandoffError extends Error {
  constructor(
    public readonly code: 'ACCESS_DENIED' | 'NOT_FOUND' | 'NOT_ELIGIBLE' | 'CONFLICT',
  ) {
    super(code)
    this.name = 'AdviceDossierIntakeHandoffError'
  }
}

export type AdviceDossierIntakeHandoffResult = Readonly<{
  intakeId: string
  reused: boolean
}>

function canReadDossier(
  viewer: AdviceDossierViewer,
  dossier: { ownerUserId: string; organizationId: string },
): boolean {
  if (viewer.isPlatformAdministrator) return false
  if (dossier.ownerUserId === viewer.userId) return true
  return (
    viewer.organizationId === dossier.organizationId &&
    (viewer.organizationRole === 'OWNER' || viewer.organizationRole === 'ADMIN')
  )
}

function isPrismaConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  if (error.code === 'P2002' || error.code === 'P2034') return true
  return error instanceof Error && error.message.includes('40001')
}

export function buildAdviceDossierContextAnswerSnapshot(
  draft: {
    contextQuestions: readonly {
      questionKey: string
      textSnapshot: string
      sequence: number
    }[]
    answers: readonly {
      questionKey: string
      disposition: string
      textValue: string | null
      optionValue: string | null
      numberValue: { toString(): string } | null
      booleanValue: boolean | null
      dateValue: Date | null
      periodValue: string | null
    }[]
  } | null,
) {
  if (!draft) return []
  const answers = new Map(
    draft.answers
      .filter((answer) => answer.disposition === 'ANSWERED')
      .map((answer) => [
        answer.questionKey,
        answer.textValue ??
          answer.optionValue ??
          answer.numberValue?.toString() ??
          answer.booleanValue?.toString() ??
          answer.dateValue?.toISOString().slice(0, 10) ??
          answer.periodValue ??
          null,
      ]),
  )

  return draft.contextQuestions
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .flatMap((question) => {
      const answer = answers.get(question.questionKey)
      return answer
        ? [{ questionKey: question.questionKey, question: question.textSnapshot, answer }]
        : []
    })
}

async function createHandoffAttempt(input: {
  viewer: AdviceDossierViewer
  dossierId: string
}): Promise<AdviceDossierIntakeHandoffResult> {
  return getPrisma().$transaction(async (transaction) => {
    const dossier = await transaction.adviceDossier.findUnique({
      where: { id: input.dossierId },
      select: {
        id: true,
        dossierCode: true,
        ownerUserId: true,
        organizationId: true,
        status: true,
        currentVersionNumber: true,
        intakeHandoff: { select: { intakeId: true } },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            originalHelpRequest: true,
            situationSummary: true,
            subject: true,
            primaryProfessionalRequirementSnapshot: true,
            additionalProfessionalRequirementsSnapshot: true,
            sourcePublicIntakeDraft: {
              select: {
                contextQuestions: {
                  select: { questionKey: true, textSnapshot: true, sequence: true },
                },
                answers: {
                  select: {
                    questionKey: true,
                    disposition: true,
                    textValue: true,
                    optionValue: true,
                    numberValue: true,
                    booleanValue: true,
                    dateValue: true,
                    periodValue: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!dossier || !canReadDossier(input.viewer, dossier)) {
      throw new AdviceDossierIntakeHandoffError('NOT_FOUND')
    }
    if (dossier.intakeHandoff) {
      return { intakeId: dossier.intakeHandoff.intakeId, reused: true }
    }
    if (!['ADVICE_READY', 'COMPLETED'].includes(dossier.status)) {
      throw new AdviceDossierIntakeHandoffError('NOT_ELIGIBLE')
    }
    if (!input.viewer.organizationId || input.viewer.organizationId !== dossier.organizationId) {
      throw new AdviceDossierIntakeHandoffError('ACCESS_DENIED')
    }

    await requireIntakeCreator(transaction, input.viewer.userId, dossier.organizationId)
    const version = dossier.versions[0]
    if (!version || version.versionNumber !== dossier.currentVersionNumber) {
      throw new AdviceDossierIntakeHandoffError('CONFLICT')
    }
    if (!Array.isArray(version.additionalProfessionalRequirementsSnapshot)) {
      throw new AdviceDossierIntakeHandoffError('CONFLICT')
    }

    const questionnaireVersion = await transaction.intakeQuestionnaireVersion.findFirst({
      where: {
        status: 'PUBLISHED',
        questionnaire: { slug: QUESTIONNAIRE_SLUG, isActive: true },
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        questions: {
          where: {
            key: { in: [INITIAL_QUESTION_KEY, 'GENERAL_RELEVANT_CONTEXT'] },
          },
          select: {
            id: true,
            key: true,
            category: true,
            inputType: true,
            isRequired: true,
            minLength: true,
            maxLength: true,
            minNumber: true,
            maxNumber: true,
            minSelections: true,
            maxSelections: true,
            options: {
              where: { isActive: true },
              select: { id: true, value: true, isActive: true, isExclusive: true },
            },
          },
        },
      },
    })
    const initialQuestion = questionnaireVersion?.questions.find(
      (question) => question.key === INITIAL_QUESTION_KEY,
    )
    const contextQuestion = questionnaireVersion?.questions.find(
      (question) => question.key === 'GENERAL_RELEVANT_CONTEXT',
    )
    if (!questionnaireVersion || !initialQuestion) {
      throw new AdviceDossierIntakeHandoffError('CONFLICT')
    }
    const initialAnswer = normalizeIntakeAnswer(
      initialQuestion,
      version.originalHelpRequest,
      { activeLocationIds: new Set() },
    )
    if (initialAnswer.isEmpty || !initialAnswer.textValue) {
      throw new AdviceDossierIntakeHandoffError('NOT_ELIGIBLE')
    }

    const now = new Date()
    const intake = await transaction.intake.create({
      data: {
        clientOrganizationId: dossier.organizationId,
        createdByUserId: input.viewer.userId,
        questionnaireVersionId: questionnaireVersion.id,
        freeText: initialAnswer.textValue,
      },
      select: { id: true },
    })
    const answer = await transaction.intakeAnswer.create({
      data: {
        intakeId: intake.id,
        questionId: initialQuestion.id,
        version: 1,
        textValue: initialAnswer.textValue,
        numberValue: initialAnswer.numberValue,
        booleanValue: initialAnswer.booleanValue,
        dateValue: initialAnswer.dateValue,
        organizationLocationId: initialAnswer.organizationLocationId,
        updatedByUserId: input.viewer.userId,
      },
      select: { id: true },
    })
    await transaction.intakeAnswerRevision.create({
      data: {
        intakeAnswerId: answer.id,
        version: 1,
        textValue: initialAnswer.textValue,
        numberValue: initialAnswer.numberValue,
        booleanValue: initialAnswer.booleanValue,
        dateValue: initialAnswer.dateValue,
        organizationLocationId: initialAnswer.organizationLocationId,
        changedByUserId: input.viewer.userId,
      },
    })
    if (contextQuestion) {
      const contextAnswer = normalizeIntakeAnswer(
        contextQuestion,
        version.situationSummary,
        { activeLocationIds: new Set() },
      )
      if (!contextAnswer.isEmpty) {
        const createdContextAnswer = await transaction.intakeAnswer.create({
          data: {
            intakeId: intake.id,
            questionId: contextQuestion.id,
            version: 1,
            textValue: contextAnswer.textValue,
            numberValue: contextAnswer.numberValue,
            booleanValue: contextAnswer.booleanValue,
            dateValue: contextAnswer.dateValue,
            organizationLocationId: contextAnswer.organizationLocationId,
            updatedByUserId: input.viewer.userId,
          },
          select: { id: true },
        })
        await transaction.intakeAnswerRevision.create({
          data: {
            intakeAnswerId: createdContextAnswer.id,
            version: 1,
            textValue: contextAnswer.textValue,
            numberValue: contextAnswer.numberValue,
            booleanValue: contextAnswer.booleanValue,
            dateValue: contextAnswer.dateValue,
            organizationLocationId: contextAnswer.organizationLocationId,
            changedByUserId: input.viewer.userId,
          },
        })
      }
    }
    await transaction.intakeStatusHistory.create({
      data: {
        intakeId: intake.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        changedByUserId: input.viewer.userId,
        reason: 'Opdrachtintake gestart vanuit Adviesdossier.',
      },
    })
    await transaction.adviceDossierIntakeHandoff.create({
      data: {
        adviceDossierId: dossier.id,
        adviceDossierVersionId: version.id,
        intakeId: intake.id,
        createdByUserId: input.viewer.userId,
        dossierCodeSnapshot: dossier.dossierCode,
        originalHelpRequestSnapshot: version.originalHelpRequest,
        situationSummarySnapshot: version.situationSummary,
        subjectSnapshot: version.subject,
        primaryProfessionalRequirementSnapshot:
          version.primaryProfessionalRequirementSnapshot ?? PrismaNamespace.JsonNull,
        additionalProfessionalRequirementsSnapshot:
          version.additionalProfessionalRequirementsSnapshot,
        contextAnswersSnapshot: buildAdviceDossierContextAnswerSnapshot(version.sourcePublicIntakeDraft),
        createdAt: now,
      },
    })

    return { intakeId: intake.id, reused: false }
  }, { isolationLevel: 'Serializable' })
}

export async function startAdviceDossierIntake(input: {
  viewer: AdviceDossierViewer
  dossierId: string
}): Promise<AdviceDossierIntakeHandoffResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createHandoffAttempt(input)
    } catch (error) {
      if (error instanceof AdviceDossierIntakeHandoffError) throw error
      if (error instanceof IntakeServiceError) {
        throw new AdviceDossierIntakeHandoffError('ACCESS_DENIED')
      }
      if (!isPrismaConflict(error)) throw error
    }

    const existing = await getPrisma().adviceDossierIntakeHandoff.findUnique({
      where: { adviceDossierId: input.dossierId },
      select: { intakeId: true },
    })
    if (existing) return { intakeId: existing.intakeId, reused: true }
  }
  throw new AdviceDossierIntakeHandoffError('CONFLICT')
}
