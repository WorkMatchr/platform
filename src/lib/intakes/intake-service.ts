import type { IntakeStatus, Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import {
  requireIntakeArchiver,
  requireIntakeCreator,
  requireIntakeEditor,
  requireIntakeReopener,
  requireIntakeReviewer,
  requireIntakeViewer,
} from './intake-authorization'
import { IntakeServiceError } from './intake-errors'
import type {
  CreateIntakeInput,
  IntakeVersionInput,
  NormalizedIntakeAnswer,
  SaveIntakeStepInput,
} from './intake-types'
import {
  answersAreEqual,
  calculateIntakeProgress,
  createIntakeInputSchema,
  intakeIdentifierSchema,
  intakeVersionInputSchema,
  normalizeIntakeAnswer,
  organizationIdentifierSchema,
  saveIntakeStepInputSchema,
} from './intake-validation'

const QUESTIONNAIRE_SLUG = 'client-occupational-health-and-safety'
const INITIAL_QUESTION_KEY = 'HELP_REQUEST_DESCRIPTION'

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

function invalidInput(): IntakeServiceError {
  return new IntakeServiceError(
    'VALIDATION_ERROR',
    'De aangeleverde intakegegevens zijn niet geldig.',
  )
}

function parseInput<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw invalidInput()
  return result.data
}

function assertExpectedVersion(current: number, expected: number): void {
  if (current !== expected) {
    throw new IntakeServiceError(
      'CONFLICT',
      'Deze intake is intussen gewijzigd. Vernieuw de gegevens en probeer het opnieuw.',
    )
  }
}

function answerValues(answer: NormalizedIntakeAnswer) {
  return {
    textValue: answer.textValue,
    numberValue: answer.numberValue,
    booleanValue: answer.booleanValue,
    dateValue: answer.dateValue,
    organizationLocationId: answer.organizationLocationId,
  }
}

async function createRevision(
  transaction: Prisma.TransactionClient,
  intakeAnswerId: string,
  version: number,
  answer: NormalizedIntakeAnswer,
  userId: string,
) {
  return transaction.intakeAnswerRevision.create({
    data: {
      intakeAnswerId,
      version,
      ...answerValues(answer),
      changedByUserId: userId,
      options: answer.optionIds.length
        ? { create: answer.optionIds.map((optionId) => ({ optionId })) }
        : undefined,
    },
    select: { id: true },
  })
}

async function createAnswer(
  transaction: Prisma.TransactionClient,
  intakeId: string,
  questionId: string,
  answer: NormalizedIntakeAnswer,
  userId: string,
) {
  const created = await transaction.intakeAnswer.create({
    data: {
      intakeId,
      questionId,
      version: 1,
      ...answerValues(answer),
      updatedByUserId: userId,
      options: answer.optionIds.length
        ? { create: answer.optionIds.map((optionId) => ({ optionId })) }
        : undefined,
    },
    select: { id: true },
  })
  await createRevision(transaction, created.id, 1, answer, userId)
}

async function updateAnswer(
  transaction: Prisma.TransactionClient,
  current: {
    id: string
    version: number
  },
  answer: NormalizedIntakeAnswer,
  userId: string,
) {
  const nextVersion = current.version + 1
  const updated = await transaction.intakeAnswer.updateMany({
    where: { id: current.id, version: current.version },
    data: {
      version: { increment: 1 },
      ...answerValues(answer),
      updatedByUserId: userId,
    },
  })
  if (updated.count !== 1) {
    throw new IntakeServiceError('CONFLICT')
  }

  await transaction.intakeAnswerOption.deleteMany({
    where: { intakeAnswerId: current.id },
  })
  if (answer.optionIds.length) {
    await transaction.intakeAnswerOption.createMany({
      data: answer.optionIds.map((optionId) => ({
        intakeAnswerId: current.id,
        optionId,
      })),
    })
  }
  await createRevision(transaction, current.id, nextVersion, answer, userId)
}

async function advanceIntake(
  transaction: Prisma.TransactionClient,
  intake: { id: string; version: number; status: IntakeStatus },
  userId: string,
  toStatus: IntakeStatus,
  reason: string,
) {
  const update = await transaction.intake.updateMany({
    where: {
      id: intake.id,
      version: intake.version,
      status: intake.status,
    },
    data: {
      version: { increment: 1 },
      status: toStatus,
      archivedAt: toStatus === 'ARCHIVED' ? new Date() : undefined,
    },
  })
  if (update.count !== 1) throw new IntakeServiceError('CONFLICT')

  if (intake.status !== toStatus) {
    await transaction.intakeStatusHistory.create({
      data: {
        intakeId: intake.id,
        fromStatus: intake.status,
        toStatus,
        changedByUserId: userId,
        reason,
      },
    })
  }

  return { id: intake.id, status: toStatus, version: intake.version + 1 }
}

export async function createIntake(
  userId: string,
  organizationId: string,
  rawInput: CreateIntakeInput,
) {
  const validatedOrganizationId = parseInput(organizationIdentifierSchema, organizationId)
  const input = parseInput(createIntakeInputSchema, rawInput)

  return getPrisma().$transaction(async (transaction) => {
    await requireIntakeCreator(transaction, userId, validatedOrganizationId)

    const questionnaireVersion = await transaction.intakeQuestionnaireVersion.findFirst({
      where: {
        status: 'PUBLISHED',
        questionnaire: { slug: QUESTIONNAIRE_SLUG, isActive: true },
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        questions: {
          where: { key: INITIAL_QUESTION_KEY },
          include: questionInclude,
          take: 1,
        },
      },
    })
    const initialQuestion = questionnaireVersion?.questions[0]
    if (!questionnaireVersion || !initialQuestion) {
      throw new IntakeServiceError(
        'QUESTIONNAIRE_UNAVAILABLE',
        'De intakevragen zijn tijdelijk niet beschikbaar.',
      )
    }

    const normalized = normalizeIntakeAnswer(initialQuestion, input.freeText, {
      activeLocationIds: new Set(),
    })
    if (normalized.isEmpty) {
      throw new IntakeServiceError('VALIDATION_ERROR', 'Beschrijf eerst waarbij Uw organisatie hulp nodig heeft.', [
        {
          questionId: initialQuestion.id,
          questionKey: initialQuestion.key,
          message: 'Dit veld is verplicht.',
        },
      ])
    }

    const intake = await transaction.intake.create({
      data: {
        clientOrganizationId: validatedOrganizationId,
        createdByUserId: userId,
        questionnaireVersionId: questionnaireVersion.id,
        freeText: normalized.textValue!,
      },
      select: { id: true, status: true, version: true },
    })
    await createAnswer(transaction, intake.id, initialQuestion.id, normalized, userId)
    await transaction.intakeStatusHistory.create({
      data: {
        intakeId: intake.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        changedByUserId: userId,
        reason: 'Intake aangemaakt.',
      },
    })

    return intake
  })
}

export async function saveIntakeStep(
  userId: string,
  intakeIdValue: string,
  rawInput: SaveIntakeStepInput,
) {
  const intakeId = parseInput(intakeIdentifierSchema, intakeIdValue)
  const input = parseInput(saveIntakeStepInputSchema, rawInput)
  if (new Set(input.answers.map((answer) => answer.questionId)).size !== input.answers.length) {
    throw invalidInput()
  }

  return getPrisma().$transaction(async (transaction) => {
    const intake = await requireIntakeEditor(transaction, userId, intakeId)
    assertExpectedVersion(intake.version, input.expectedIntakeVersion)

    const questions = await transaction.intakeQuestion.findMany({
      where: {
        id: { in: input.answers.map((answer) => answer.questionId) },
        questionnaireVersionId: intake.questionnaireVersionId,
        category: input.category,
      },
      include: questionInclude,
    })
    if (questions.length !== input.answers.length) throw invalidInput()

    const activeLocations = await transaction.organizationLocation.findMany({
      where: {
        organizationId: intake.clientOrganizationId,
        archivedAt: null,
      },
      select: { id: true },
    })
    const activeLocationIds = new Set(activeLocations.map(({ id }) => id))
    const currentAnswers = await transaction.intakeAnswer.findMany({
      where: {
        intakeId,
        questionId: { in: questions.map((question) => question.id) },
      },
      include: answerInclude,
    })
    const questionsById = new Map(questions.map((question) => [question.id, question]))
    const currentByQuestionId = new Map(currentAnswers.map((answer) => [answer.questionId, answer]))
    const mutations: Array<{
      questionId: string
      normalized: NormalizedIntakeAnswer
      current: (typeof currentAnswers)[number] | undefined
    }> = []
    let hasMeaningfulAnswer = false

    for (const answerInput of input.answers) {
      const question = questionsById.get(answerInput.questionId)
      if (!question) throw invalidInput()
      const normalized = normalizeIntakeAnswer(question, answerInput.value, {
        activeLocationIds,
      })
      const current = currentByQuestionId.get(question.id)
      hasMeaningfulAnswer ||= !normalized.isEmpty

      if (!current && normalized.isEmpty) continue
      if (current && answersAreEqual(current, normalized)) continue
      mutations.push({ questionId: question.id, normalized, current })
    }

    const nextStatus = intake.status === 'DRAFT' && hasMeaningfulAnswer ? 'IN_PROGRESS' : intake.status
    if (mutations.length === 0 && nextStatus === intake.status) {
      return {
        id: intake.id,
        status: intake.status,
        version: intake.version,
        changedAnswers: 0,
      }
    }

    const advanced = await advanceIntake(
      transaction,
      intake,
      userId,
      nextStatus,
      nextStatus === intake.status ? 'Conceptantwoorden bijgewerkt.' : 'Intake inhoudelijk gestart.',
    )

    for (const mutation of mutations) {
      if (mutation.current) {
        await updateAnswer(transaction, mutation.current, mutation.normalized, userId)
      } else {
        await createAnswer(transaction, intakeId, mutation.questionId, mutation.normalized, userId)
      }
    }

    return { ...advanced, changedAnswers: mutations.length }
  })
}

async function loadProgress(transaction: Prisma.TransactionClient, intake: { id: string; questionnaireVersionId: string }) {
  const [questions, answers] = await Promise.all([
    transaction.intakeQuestion.findMany({
      where: { questionnaireVersionId: intake.questionnaireVersionId },
      select: { id: true, key: true, category: true, isRequired: true },
      orderBy: { sortOrder: 'asc' },
    }),
    transaction.intakeAnswer.findMany({
      where: { intakeId: intake.id },
      select: {
        questionId: true,
        textValue: true,
        numberValue: true,
        booleanValue: true,
        dateValue: true,
        organizationLocationId: true,
        options: { select: { option: { select: { value: true } } } },
      },
    }),
  ])
  return calculateIntakeProgress(questions, answers)
}

export async function getIntakeProgress(userId: string, intakeIdValue: string) {
  const intakeId = parseInput(intakeIdentifierSchema, intakeIdValue)
  return getPrisma().$transaction(async (transaction) => {
    const intake = await requireIntakeViewer(transaction, userId, intakeId)
    return loadProgress(transaction, intake)
  })
}

export async function markIntakeReadyForReview(
  userId: string,
  intakeIdValue: string,
  rawInput: IntakeVersionInput,
) {
  const intakeId = parseInput(intakeIdentifierSchema, intakeIdValue)
  const input = parseInput(intakeVersionInputSchema, rawInput)

  return getPrisma().$transaction(async (transaction) => {
    const intake = await requireIntakeReviewer(transaction, userId, intakeId)
    assertExpectedVersion(intake.version, input.expectedIntakeVersion)
    const progress = await loadProgress(transaction, intake)
    if (!progress.isComplete) {
      throw new IntakeServiceError(
        'VALIDATION_ERROR',
        'Beantwoord alle verplichte vragen voordat U de intake controleert.',
        progress.missingQuestionKeys.map((questionKey) => ({
          questionKey,
          message: 'Deze vraag moet nog worden beantwoord.',
        })),
      )
    }
    return advanceIntake(
      transaction,
      intake,
      userId,
      'READY_FOR_REVIEW',
      'Intake gereed voor controle.',
    )
  })
}

export async function reopenIntake(
  userId: string,
  intakeIdValue: string,
  rawInput: IntakeVersionInput,
) {
  const intakeId = parseInput(intakeIdentifierSchema, intakeIdValue)
  const input = parseInput(intakeVersionInputSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    const intake = await requireIntakeReopener(transaction, userId, intakeId)
    assertExpectedVersion(intake.version, input.expectedIntakeVersion)
    return advanceIntake(transaction, intake, userId, 'IN_PROGRESS', 'Intake heropend voor aanpassingen.')
  })
}

export async function archiveIntake(
  userId: string,
  intakeIdValue: string,
  rawInput: IntakeVersionInput,
) {
  const intakeId = parseInput(intakeIdentifierSchema, intakeIdValue)
  const input = parseInput(intakeVersionInputSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    const intake = await requireIntakeArchiver(transaction, userId, intakeId)
    assertExpectedVersion(intake.version, input.expectedIntakeVersion)
    return advanceIntake(transaction, intake, userId, 'ARCHIVED', 'Conceptintake gearchiveerd.')
  })
}
