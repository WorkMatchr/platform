import type {
  IntakeQuestionCategory,
  IntakeQuestionInputType,
  IntakeStatus,
  OrganizationMembershipRole,
  Prisma,
} from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireIntakeCreator, requireIntakeViewer } from './intake-authorization'
import { IntakeServiceError } from './intake-errors'
import type { IntakeProgress } from './intake-types'
import { calculateIntakeProgress } from './intake-validation'

const progressQuestionSelect = {
  id: true,
  key: true,
  category: true,
  isRequired: true,
} satisfies Prisma.IntakeQuestionSelect

const progressAnswerSelect = {
  questionId: true,
  textValue: true,
  numberValue: true,
  booleanValue: true,
  dateValue: true,
  organizationLocationId: true,
  options: { select: { option: { select: { value: true } } } },
} satisfies Prisma.IntakeAnswerSelect

export type IntakeListItem = {
  id: string
  freeText: string
  status: IntakeStatus
  version: number
  updatedAt: string
  createdByDisplayName: string | null
  isOwn: boolean
  progress: IntakeProgress
}

export type IntakeQuestionView = {
  id: string
  key: string
  category: IntakeQuestionCategory
  inputType: IntakeQuestionInputType
  label: string
  helpText: string | null
  isRequired: boolean
  minLength: number | null
  maxLength: number | null
  minNumber: string | null
  maxNumber: string | null
  minSelections: number | null
  maxSelections: number | null
  options: Array<{
    id: string
    value: string
    label: string
    isExclusive: boolean
  }>
  value: string | string[] | boolean | null
}

export type IntakeDetailView = {
  id: string
  organizationId: string
  organizationName: string
  createdByUserId: string
  createdByDisplayName: string | null
  viewerRole: OrganizationMembershipRole
  status: IntakeStatus
  version: number
  freeText: string
  updatedAt: string
  progress: IntakeProgress
  questions: IntakeQuestionView[]
  locations: Array<{ id: string; label: string }>
}

function answerValue(answer: {
  textValue: string | null
  numberValue: { toString(): string } | null
  booleanValue: boolean | null
  dateValue: Date | null
  organizationLocationId: string | null
  options: Array<{ optionId: string }>
} | undefined): IntakeQuestionView['value'] {
  if (!answer) return null
  if (answer.textValue !== null) return answer.textValue
  if (answer.numberValue !== null) return answer.numberValue.toString()
  if (answer.booleanValue !== null) return answer.booleanValue
  if (answer.dateValue !== null) return answer.dateValue.toISOString().slice(0, 10)
  if (answer.organizationLocationId !== null) return answer.organizationLocationId
  if (answer.options.length > 0) return answer.options.map(({ optionId }) => optionId)
  return null
}

export async function listIntakesForOrganization(
  userId: string,
  organizationId: string,
): Promise<{ items: IntakeListItem[]; viewerRole: OrganizationMembershipRole }> {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireIntakeCreator(transaction, userId, organizationId)
    const intakes = await transaction.intake.findMany({
      where: {
        clientOrganizationId: organizationId,
        archivedAt: null,
        ...(access.membershipRole === 'MEMBER' ? { createdByUserId: userId } : {}),
      },
      select: {
        id: true,
        freeText: true,
        status: true,
        version: true,
        updatedAt: true,
        createdByUserId: true,
        createdByUser: { select: { displayName: true } },
        questionnaireVersion: {
          select: { questions: { select: progressQuestionSelect, orderBy: { sortOrder: 'asc' } } },
        },
        answers: { select: progressAnswerSelect },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      viewerRole: access.membershipRole,
      items: intakes.map((intake) => ({
        id: intake.id,
        freeText: intake.freeText,
        status: intake.status,
        version: intake.version,
        updatedAt: intake.updatedAt.toISOString(),
        createdByDisplayName: intake.createdByUser.displayName,
        isOwn: intake.createdByUserId === userId,
        progress: calculateIntakeProgress(intake.questionnaireVersion.questions, intake.answers),
      })),
    }
  })
}

export async function getIntakeDetail(userId: string, intakeId: string): Promise<IntakeDetailView> {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireIntakeViewer(transaction, userId, intakeId)
    const intake = await transaction.intake.findUnique({
      where: { id: access.id },
      select: {
        id: true,
        clientOrganizationId: true,
        createdByUserId: true,
        status: true,
        version: true,
        freeText: true,
        updatedAt: true,
        createdByUser: { select: { displayName: true } },
        clientOrganization: {
          select: {
            name: true,
            locations: {
              where: { archivedAt: null },
              select: { id: true, label: true, city: true, isPrimary: true },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
        questionnaireVersion: {
          select: {
            questions: {
              select: {
                ...progressQuestionSelect,
                inputType: true,
                label: true,
                helpText: true,
                minLength: true,
                maxLength: true,
                minNumber: true,
                maxNumber: true,
                minSelections: true,
                maxSelections: true,
                options: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    value: true,
                    label: true,
                    isExclusive: true,
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        answers: {
          select: {
            ...progressAnswerSelect,
            options: {
              select: {
                optionId: true,
                option: { select: { value: true } },
              },
            },
          },
        },
      },
    })

    if (!intake) throw new IntakeServiceError('ACCESS_DENIED')

    const answersByQuestion = new Map(intake.answers.map((answer) => [answer.questionId, answer]))
    const membership = access.clientOrganization.memberships[0]
    if (!membership) throw new IntakeServiceError('ACCESS_DENIED')

    return {
      id: intake.id,
      organizationId: intake.clientOrganizationId,
      organizationName: intake.clientOrganization.name,
      createdByUserId: intake.createdByUserId,
      createdByDisplayName: intake.createdByUser.displayName,
      viewerRole: membership.role,
      status: intake.status,
      version: intake.version,
      freeText: intake.freeText,
      updatedAt: intake.updatedAt.toISOString(),
      progress: calculateIntakeProgress(
        intake.questionnaireVersion.questions,
        intake.answers,
      ),
      questions: intake.questionnaireVersion.questions.map((question) => ({
        id: question.id,
        key: question.key,
        category: question.category,
        inputType: question.inputType,
        label: question.label,
        helpText: question.helpText,
        isRequired: question.isRequired,
        minLength: question.minLength,
        maxLength: question.maxLength,
        minNumber: question.minNumber?.toString() ?? null,
        maxNumber: question.maxNumber?.toString() ?? null,
        minSelections: question.minSelections,
        maxSelections: question.maxSelections,
        options: question.options,
        value: answerValue(answersByQuestion.get(question.id)),
      })),
      locations: intake.clientOrganization.locations.map((location) => ({
        id: location.id,
        label: `${location.label} — ${location.city}`,
      })),
    }
  })
}
