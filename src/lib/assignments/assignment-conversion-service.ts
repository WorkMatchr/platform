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
import {
  nonRegisteredLocationSnapshot,
  registeredLocationSnapshot,
} from './assignment-location'
import { generateAssignmentDescription, generateAssignmentTitle } from './assignment-generation'
import { evaluateIntakeAssignmentReadiness } from './intake-assignment-readiness'
import { locationItemsFromSerialized } from '@/lib/intakes/intake-multiple-locations'

const HELP_REQUEST_KEY = 'HELP_REQUEST_DESCRIPTION'
const DESIRED_OUTCOME_KEY = 'DESIRED_OUTCOME_DESCRIPTION'
const SITUATION_KEY = 'SITUATION_DESCRIPTION'
const EMPLOYEE_COUNT_KEY = 'AFFECTED_EMPLOYEE_COUNT'
const WORK_MODE_KEY = 'PREFERRED_WORK_MODE'
const LOCATION_KEY = 'PRIMARY_LOCATION'
const START_DATE_KEY = 'PREFERRED_START_DATE'
const V2_GOAL_KEY = 'GENERAL_SUPPORT_GOAL'
const V2_CONTEXT_KEY = 'GENERAL_RELEVANT_CONTEXT'
const V2_BHV_CONTEXT_KEY = 'BHV_LOCATION_CHARACTERISTICS'
const V2_EMPLOYEE_COUNT_KEY = 'BHV_EMPLOYEE_COUNT'
const V2_LOCATION_MODE_KEY = 'LOCATION_MODE'
const V2_LOCATION_KEY = 'REGISTERED_LOCATION'
const V2_OTHER_LOCATION_CITY_KEY = 'OTHER_LOCATION_CITY'
const V2_OTHER_LOCATION_DETAILS_KEY = 'OTHER_LOCATION_DETAILS'
const V2_MULTIPLE_LOCATION_DETAILS_KEY = 'MULTIPLE_LOCATION_DETAILS'

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

function textForFirstKey(
  questions: ConversionQuestion[],
  answersByQuestionId: ReadonlyMap<string, ConversionAnswer>,
  keys: readonly string[],
  fallback: string,
): string {
  for (const key of keys) {
    const answer = answerForKey(questions, answersByQuestionId, key)
    if (answer?.textValue?.trim()) return answer.textValue
  }
  return fallback
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
  intake: {
    id: string
    questionnaireVersionId: string
    clientOrganizationId: string
    questionnaireVersion: { version: number }
  },
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
      select: {
        id: true,
        label: true,
        addressLine: true,
        postalCode: true,
        city: true,
        province: true,
        countryCode: true,
      },
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

  const progress = calculateIntakeProgress(questions, answers, intake.questionnaireVersion.version)
  const readiness = evaluateIntakeAssignmentReadiness({
    intakeId: intake.id,
    questionnaireVersion: intake.questionnaireVersion.version,
    missingQuestionKeys: progress.missingQuestionKeys,
    questions: questions.map((question) => {
      const answer = answersByQuestionId.get(question.id)
      return {
        id: question.id,
        key: question.key,
        category: question.category,
        label: question.label,
        selectedOptionValues: answer?.options.map(({ option }) => option.value) ?? [],
        organizationLocationId: answer?.organizationLocationId ?? null,
        textValue: answer?.textValue ?? null,
      }
    }),
    activeLocationIds,
  })
  if (!readiness.isReady) {
    throw new AssignmentServiceError(
      'VALIDATION_ERROR',
      'Uw opdracht kan nog niet worden gepubliceerd. Vul eerst de ontbrekende gegevens aan.',
      readiness.issues.map(({ questionId, questionKey, message }) => ({ questionId, questionKey, message })),
      {},
      readiness.issues,
    )
  }

  return {
    questions,
    questionsById,
    answersByQuestionId,
    activeLocationsById: new Map(activeLocations.map((location) => [location.id, location])),
    sectorId: activeSectors.length === 1 ? activeSectors[0]?.sectorId ?? null : null,
  }
}

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code)
}

export async function convertIntakeToAssignmentInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  intakeIdValue: string,
  rawInput: IntakeVersionInput,
) {
  const { intakeId, input } = parseConversionInput(intakeIdValue, rawInput)

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
        const canAutomaticallyPrepareForReview =
          (intake.status === 'DRAFT' || intake.status === 'IN_PROGRESS')
        if (intake.status !== 'READY_FOR_REVIEW' && !canAutomaticallyPrepareForReview) {
          throw new AssignmentServiceError('INVALID_STATUS')
        }
        if (intake.version !== input.expectedIntakeVersion) {
          throw new AssignmentServiceError('CONFLICT')
        }

        const source = await validateConversionSource(transaction, intake)
        let conversionVersion = input.expectedIntakeVersion
        if (canAutomaticallyPrepareForReview) {
          const prepared = await transaction.intake.updateMany({
            where: {
              id: intake.id,
              version: input.expectedIntakeVersion,
              status: intake.status,
            },
            data: {
              status: 'READY_FOR_REVIEW',
              version: { increment: 1 },
            },
          })
          if (prepared.count !== 1) throw new AssignmentServiceError('CONFLICT')

          await transaction.intakeStatusHistory.create({
            data: {
              intakeId: intake.id,
              fromStatus: intake.status,
              toStatus: 'READY_FOR_REVIEW',
              changedByUserId: userId,
              reason: 'Volledige intake automatisch gereedgemaakt tijdens indiening.',
            },
          })
          conversionVersion += 1
        }
        const helpRequest = requiredText(source.questionsById, source.answersByQuestionId, HELP_REQUEST_KEY)
        const desiredOutcome = textForFirstKey(
          source.questions,
          source.answersByQuestionId,
          [DESIRED_OUTCOME_KEY, V2_GOAL_KEY],
          helpRequest,
        )
        const situation = textForFirstKey(
          source.questions,
          source.answersByQuestionId,
          [SITUATION_KEY, V2_CONTEXT_KEY, V2_BHV_CONTEXT_KEY],
          helpRequest,
        )
        const employeeCountAnswer = answerForKey(source.questions, source.answersByQuestionId, EMPLOYEE_COUNT_KEY)
          ?? answerForKey(source.questions, source.answersByQuestionId, V2_EMPLOYEE_COUNT_KEY)
        const workModeAnswer = answerForKey(source.questions, source.answersByQuestionId, WORK_MODE_KEY)
          ?? answerForKey(source.questions, source.answersByQuestionId, V2_LOCATION_MODE_KEY)
        const locationAnswer = answerForKey(source.questions, source.answersByQuestionId, LOCATION_KEY)
          ?? answerForKey(source.questions, source.answersByQuestionId, V2_LOCATION_KEY)
        const startDateAnswer = intake.questionnaireVersion.version < 2
          ? answerForKey(source.questions, source.answersByQuestionId, START_DATE_KEY)
          : undefined
        const workMode = workModeAnswer?.options[0]?.option.value
        const locationType = intake.questionnaireVersion.version >= 2
          ? (workMode ?? 'UNKNOWN')
          : locationAnswer?.organizationLocationId
            ? 'REGISTERED'
            : workMode === 'REMOTE'
              ? 'REMOTE'
              : 'UNKNOWN'
        const registeredLocation = locationAnswer?.organizationLocationId
          ? source.activeLocationsById.get(locationAnswer.organizationLocationId)
          : undefined
        const multipleLocationItems = locationType === 'MULTIPLE'
          ? locationItemsFromSerialized(
              answerForKey(source.questions, source.answersByQuestionId, V2_MULTIPLE_LOCATION_DETAILS_KEY)?.textValue,
            )
          : []
        const assignmentLocation = locationType === 'REGISTERED' && registeredLocation
          ? registeredLocationSnapshot(registeredLocation)
          : nonRegisteredLocationSnapshot({
              locationType: locationType === 'OTHER' || locationType === 'MULTIPLE' || locationType === 'REMOTE'
                ? locationType
                : 'UNKNOWN',
              locationCity: answerForKey(source.questions, source.answersByQuestionId, V2_OTHER_LOCATION_CITY_KEY)?.textValue ?? null,
              locationRegion: null,
              locationDescription: locationType === 'OTHER'
                ? answerForKey(source.questions, source.answersByQuestionId, V2_OTHER_LOCATION_DETAILS_KEY)?.textValue ?? null
                : null,
              locationCount: locationType === 'MULTIPLE' ? multipleLocationItems.length : null,
            })
        const submittedAt = new Date()

        const submitted = await transaction.intake.updateMany({
          where: {
            id: intake.id,
            version: conversionVersion,
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
          knowledgeContextId: intake.knowledgeContextId,
          knowledgeContextVersion: intake.knowledgeContextVersion,
          knowledgeSourceRoute: intake.knowledgeSourceRoute,
          knowledgeSuggestedCategory: intake.knowledgeSuggestedCategory,
          status: 'DRAFT' as const,
          version: 1,
          sectorId: source.sectorId,
          employeeCount: employeeCountAnswer?.numberValue
            ? Number(employeeCountAnswer.numberValue.toString())
            : null,
          desiredStartDate: startDateAnswer?.dateValue ?? null,
          ...assignmentLocation,
        }

        const assignment = await transaction.assignment.create({
          data: {
            ...assignmentData,
            locationItems: multipleLocationItems.length ? { create: multipleLocationItems } : undefined,
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
                knowledgeContextId: assignmentData.knowledgeContextId,
                knowledgeContextVersion: assignmentData.knowledgeContextVersion,
                knowledgeSourceRoute: assignmentData.knowledgeSourceRoute,
                knowledgeSuggestedCategory: assignmentData.knowledgeSuggestedCategory,
                primarySpecialismId: null,
                sectorId: assignmentData.sectorId,
                employeeCount: assignmentData.employeeCount,
                desiredStartDate: assignmentData.desiredStartDate,
                responseDeadline: null,
                locationType: assignmentData.locationType,
                locationId: assignmentData.locationId,
                locationName: assignmentData.locationName,
                locationAddressLine: assignmentData.locationAddressLine,
                locationPostalCode: assignmentData.locationPostalCode,
                locationCity: assignmentData.locationCity,
                locationProvince: assignmentData.locationProvince,
                locationCountryCode: assignmentData.locationCountryCode,
                locationRegion: assignmentData.locationRegion,
                locationDescription: assignmentData.locationDescription,
                locationCount: assignmentData.locationCount,
                allowsRemoteWork: assignmentData.allowsRemoteWork,
                changedByUserId: userId,
                locationItems: multipleLocationItems.length ? { create: multipleLocationItems } : undefined,
              },
            },
          },
          select: { id: true, status: true, version: true },
        })

        const convertedAt = new Date()
        const converted = await transaction.intake.updateMany({
          where: {
            id: intake.id,
            version: conversionVersion,
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
}

export async function convertIntakeToAssignment(
  userId: string,
  intakeIdValue: string,
  rawInput: IntakeVersionInput,
) {
  try {
    return await getPrisma().$transaction(
      (transaction) => convertIntakeToAssignmentInTransaction(
        transaction,
        userId,
        intakeIdValue,
        rawInput,
      ),
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
