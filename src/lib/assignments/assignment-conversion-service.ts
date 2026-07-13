import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireIntakeConverter } from '@/lib/intakes/intake-authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import type { IntakeVersionInput } from '@/lib/intakes/intake-types'
import {
  calculateIntakeProgress,
  intakeIdentifierSchema,
  intakeVersionInputSchema,
  normalizeIntakeAnswer,
} from '@/lib/intakes/intake-validation'
import { AssignmentServiceError } from './assignment-errors'
import { generateAssignmentDescription, generateAssignmentTitle } from './assignment-generation'

const HELP_REQUEST_KEY = 'HELP_REQUEST_DESCRIPTION'
const DESIRED_OUTCOME_KEY = 'DESIRED_OUTCOME_DESCRIPTION'
const SITUATION_KEY = 'SITUATION_DESCRIPTION'
const EMPLOYEE_COUNT_KEY = 'AFFECTED_EMPLOYEE_COUNT'
const WORK_MODE_KEY = 'PREFERRED_WORK_MODE'
const LOCATION_KEY = 'PRIMARY_LOCATION'
const START_DATE_KEY = 'PREFERRED_START_DATE'

const questionInclude = {
  options: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      value: true,
      isActive: true,
      isExclusive: true,
    },
  },
} satisfies Prisma.IntakeQuestionInclude

const answerInclude = {
  options: {
    select: {
      optionId: true,
      option: { select: { value: true } },
    },
  },
} satisfies Prisma.IntakeAnswerInclude

type ConversionQuestion = Prisma.IntakeQuestionGetPayload<{ include: typeof questionInclude }>
type ConversionAnswer = Prisma.IntakeAnswerGetPayload<{ include: typeof answerInclude }>

function parseConversionInput(intakeIdValue: string, rawInput: IntakeVersionInput) {
  const intakeId = intakeIdentifierSchema.safeParse(intakeIdValue)
  const input = intakeVersionInputSchema.safeParse(rawInput)

  if (!intakeId.success || !input.success) {
    throw new AssignmentServiceError('VALIDATION_ERROR', 'De aangeleverde conversiegegevens zijn niet geldig.')
  }

  return { intakeId: intakeId.data, input: input.data }
}

function rawStoredValue(question: ConversionQuestion, answer: ConversionAnswer): unknown {
  switch (question.inputType) {
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
      return answer.textValue
    case 'NUMBER':
      return answer.numberValue?.toString() ?? null
    case 'BOOLEAN':
      return answer.booleanValue
    case 'DATE':
      return answer.dateValue?.toISOString().slice(0, 10) ?? null
    case 'SINGLE_SELECT':
      return answer.options[0]?.optionId ?? null
    case 'MULTI_SELECT':
      return answer.options.map(({ optionId }) => optionId)
    case 'ORGANIZATION_LOCATION':
      return answer.organizationLocationId
    default: {
      const exhaustive: never = question.inputType
      return exhaustive
    }
  }
}

function requiredText(
  questionsById: ReadonlyMap<string, ConversionQuestion>,
  answersByQuestionId: ReadonlyMap<string, ConversionAnswer>,
  key: string,
): string {
  const question = [...questionsById.values()].find((candidate) => candidate.key === key)
  const value = question ? answersByQuestionId.get(question.id)?.textValue : null
  if (!value) throw new AssignmentServiceError('VALIDATION_ERROR')
  return value
}

function answerForKey(
  questions: ConversionQuestion[],
  answersByQuestionId: ReadonlyMap<string, ConversionAnswer>,
  key: string,
): ConversionAnswer | undefined {
  const question = questions.find((candidate) => candidate.key === key)
  return question ? answersByQuestionId.get(question.id) : undefined
}

async function validateConversionSource(
  transaction: Prisma.TransactionClient,
  intake: { id: string; questionnaireVersionId: string; clientOrganizationId: string },
) {
  const [questions, answers, activeLocations, activeSectors] = await Promise.all([
    transaction.intakeQuestion.findMany({
      where: { questionnaireVersionId: intake.questionnaireVersionId },
      include: questionInclude,
      orderBy: { sortOrder: 'asc' },
    }),
    transaction.intakeAnswer.findMany({
      where: { intakeId: intake.id },
      include: answerInclude,
    }),
    transaction.organizationLocation.findMany({
      where: { organizationId: intake.clientOrganizationId, archivedAt: null },
      select: { id: true },
    }),
    transaction.organizationSector.findMany({
      where: { organizationId: intake.clientOrganizationId, sector: { isActive: true } },
      select: { sectorId: true },
    }),
  ])

  const questionsById = new Map(questions.map((question) => [question.id, question]))
  const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]))
  const activeLocationIds = new Set(activeLocations.map(({ id }) => id))

  if (answers.some((answer) => !questionsById.has(answer.questionId))) {
    throw new AssignmentServiceError('VALIDATION_ERROR')
  }

  try {
    for (const answer of answers) {
      const question = questionsById.get(answer.questionId)
      if (!question) throw new AssignmentServiceError('VALIDATION_ERROR')
      normalizeIntakeAnswer(question, rawStoredValue(question, answer), { activeLocationIds })
    }
  } catch (error) {
    if (error instanceof IntakeServiceError) {
      throw new AssignmentServiceError('VALIDATION_ERROR', undefined, error.issues)
    }
    throw error
  }

  const progress = calculateIntakeProgress(questions, answers)
  if (!progress.isComplete) {
    throw new AssignmentServiceError(
      'VALIDATION_ERROR',
      undefined,
      progress.missingQuestionKeys.map((questionKey) => ({
        questionKey,
        message: 'Deze vraag moet nog worden beantwoord.',
      })),
    )
  }

  return {
    questions,
    questionsById,
    answersByQuestionId,
    sectorId: activeSectors.length === 1 ? activeSectors[0]?.sectorId ?? null : null,
  }
}

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code)
}

export async function convertIntakeToAssignment(
  userId: string,
  intakeIdValue: string,
  rawInput: IntakeVersionInput,
) {
  const { intakeId, input } = parseConversionInput(intakeIdValue, rawInput)

  try {
    return await getPrisma().$transaction(
      async (transaction) => {
        const intake = await requireIntakeConverter(transaction, userId, intakeId)
        const existingAssignment = await transaction.assignment.findUnique({
          where: { intakeId },
          select: { id: true, clientOrganizationId: true, status: true, version: true },
        })

        if (
          intake.status === 'CONVERTED' &&
          existingAssignment?.clientOrganizationId === intake.clientOrganizationId
        ) {
          return {
            id: existingAssignment.id,
            status: existingAssignment.status,
            version: existingAssignment.version,
            idempotent: true,
          }
        }
        if (intake.status === 'CONVERTED') throw new AssignmentServiceError('INTEGRITY_ERROR')
        if (existingAssignment) throw new AssignmentServiceError('INTEGRITY_ERROR')
        if (intake.status !== 'READY_FOR_REVIEW') {
          throw new AssignmentServiceError('INVALID_STATUS')
        }
        if (intake.version !== input.expectedIntakeVersion) {
          throw new AssignmentServiceError('CONFLICT')
        }

        const source = await validateConversionSource(transaction, intake)
        const helpRequest = requiredText(source.questionsById, source.answersByQuestionId, HELP_REQUEST_KEY)
        const desiredOutcome = requiredText(
          source.questionsById,
          source.answersByQuestionId,
          DESIRED_OUTCOME_KEY,
        )
        const situation = requiredText(source.questionsById, source.answersByQuestionId, SITUATION_KEY)
        const employeeCountAnswer = answerForKey(source.questions, source.answersByQuestionId, EMPLOYEE_COUNT_KEY)
        const workModeAnswer = answerForKey(source.questions, source.answersByQuestionId, WORK_MODE_KEY)
        const locationAnswer = answerForKey(source.questions, source.answersByQuestionId, LOCATION_KEY)
        const startDateAnswer = answerForKey(source.questions, source.answersByQuestionId, START_DATE_KEY)
        const workMode = workModeAnswer?.options[0]?.option.value
        const submittedAt = new Date()

        const submitted = await transaction.intake.updateMany({
          where: {
            id: intake.id,
            version: input.expectedIntakeVersion,
            status: 'READY_FOR_REVIEW',
          },
          data: {
            status: 'SUBMITTED',
            submittedAt,
            submittedByUserId: userId,
          },
        })
        if (submitted.count !== 1) throw new AssignmentServiceError('CONFLICT')

        await transaction.intakeStatusHistory.create({
          data: {
            intakeId: intake.id,
            fromStatus: 'READY_FOR_REVIEW',
            toStatus: 'SUBMITTED',
            changedByUserId: userId,
            reason: 'Intake ingediend voor opdrachtvorming.',
          },
        })

        const assignmentData = {
          intakeId: intake.id,
          clientOrganizationId: intake.clientOrganizationId,
          createdByUserId: userId,
          title: generateAssignmentTitle(helpRequest),
          description: generateAssignmentDescription({ helpRequest, desiredOutcome, situation }),
          status: 'DRAFT' as const,
          version: 1,
          sectorId: source.sectorId,
          employeeCount: employeeCountAnswer?.numberValue
            ? Number(employeeCountAnswer.numberValue.toString())
            : null,
          desiredStartDate: startDateAnswer?.dateValue ?? null,
          locationId: locationAnswer?.organizationLocationId ?? null,
          allowsRemoteWork: workMode === 'HYBRID' || workMode === 'REMOTE',
        }

        const assignment = await transaction.assignment.create({
          data: {
            ...assignmentData,
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: 'DRAFT',
                changedByUserId: userId,
                reason: 'Opdracht gevormd uit gevalideerde intake.',
              },
            },
            revisions: {
              create: {
                version: 1,
                title: assignmentData.title,
                description: assignmentData.description,
                primarySpecialismId: null,
                sectorId: assignmentData.sectorId,
                employeeCount: assignmentData.employeeCount,
                desiredStartDate: assignmentData.desiredStartDate,
                responseDeadline: null,
                locationId: assignmentData.locationId,
                allowsRemoteWork: assignmentData.allowsRemoteWork,
                changedByUserId: userId,
              },
            },
          },
          select: { id: true, status: true, version: true },
        })

        const convertedAt = new Date()
        const converted = await transaction.intake.updateMany({
          where: {
            id: intake.id,
            version: input.expectedIntakeVersion,
            status: 'SUBMITTED',
          },
          data: {
            status: 'CONVERTED',
            convertedAt,
            version: { increment: 1 },
          },
        })
        if (converted.count !== 1) throw new AssignmentServiceError('CONFLICT')

        await transaction.intakeStatusHistory.create({
          data: {
            intakeId: intake.id,
            fromStatus: 'SUBMITTED',
            toStatus: 'CONVERTED',
            changedByUserId: userId,
            reason: 'Conceptopdracht transactioneel gevormd.',
          },
        })

        return { ...assignment, idempotent: false }
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    if (error instanceof AssignmentServiceError) throw error
    if (error instanceof IntakeServiceError && error.code === 'ACCESS_DENIED') {
      throw new AssignmentServiceError('ACCESS_DENIED')
    }
    if (isPrismaErrorWithCode(error, 'P2002') || isPrismaErrorWithCode(error, 'P2034')) {
      throw new AssignmentServiceError('CONFLICT')
    }
    throw error
  }
}
