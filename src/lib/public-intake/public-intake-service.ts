import type {
  Prisma,
  PublicIntakeAnswerSource,
  PublicIntakeEventType,
  PublicIntakePhase,
} from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import {
  PUBLIC_INTAKE_FLOW_VERSION,
  PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION,
  publicIntakeExpiryFrom,
} from './public-intake-config'
import { PublicIntakeServiceError } from './public-intake-errors'
import {
  canAbandonPublicIntakeDraftByUser,
  canChangePublicIntakePhase,
  isTerminalPublicIntakePhase,
  isPublicIntakeResumable,
  shouldRecordPublicIntakeResumeEvent,
} from './public-intake-lifecycle'
import {
  hashPublicIntakeToken,
  isValidPublicIntakeToken,
  generatePublicIntakeToken,
  publicIntakeTokenMatches,
} from './public-intake-token'
import type { PublicIntakeDraftView } from './public-intake-types'
import { buildPublicIntakeGuidanceHandoff } from './public-intake-guidance-handoff'
import {
  normalizePublicIntakeAnswer,
  parseCreatePublicIntakeDraftInput,
  type RecordPublicIntakeAnswerInput,
} from './public-intake-validation'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'
import { getAIContextQuestion } from '@/lib/ai-intake-classifier/ai-context-question-catalog'
import { toPublicIntakeContextQuestionView } from './public-intake-context-question-service'
import {
  getSharedSectorOptions,
  resolveSharedAssignmentContext,
  SHARED_CONTEXT_SECTOR_QUESTION_KEY,
} from './shared-assignment-context'

type Transaction = Prisma.TransactionClient

const TERMINAL_OR_LATER_PHASES: readonly PublicIntakePhase[] = [
  'REGISTRATION_STARTED',
  'ACCOUNT_LINKED',
  'SUBMITTED',
  'ABANDONED',
  'ABANDONED_BY_USER',
  'ABANDONED_TIMEOUT',
  'EXPIRED',
]

const publicDraftSelect = {
  id: true,
  phase: true,
  entryPoint: true,
  originalInput: true,
  selectedRequestKey: true,
  knowledgeContextId: true,
  knowledgeContextVersion: true,
  knowledgeSourceRoute: true,
  knowledgeSuggestedCategory: true,
  flowVersion: true,
  currentStep: true,
  version: true,
  startedAt: true,
  lastInteractionAt: true,
  expiresAt: true,
  answers: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      questionKey: true,
      questionVersion: true,
      answerType: true,
      disposition: true,
      source: true,
      version: true,
      textValue: true,
      optionValue: true,
      numberValue: true,
      booleanValue: true,
      dateValue: true,
      periodValue: true,
    },
  },
  contextQuestions: {
    orderBy: { sequence: 'asc' as const },
    select: {
      questionKey: true,
      catalogVersion: true,
      textSnapshot: true,
      answerType: true,
      category: true,
      sequence: true,
      source: true,
      createdAt: true,
    },
  },
} satisfies Prisma.PublicIntakeDraftSelect

type AccessResult =
  | {
      kind: 'VALID'
      session: {
        id: string
        draftId: string
        expiresAt: Date
        lastUsedAt: Date
        lastResumeEventAt: Date | null
        draft: { id: string; phase: PublicIntakePhase; version: number; expiresAt: Date }
      }
    }
  | { kind: 'DENIED' }
  | { kind: 'EXPIRED' }

function isPrismaConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'P2002' || error.code === 'P2034'),
  )
}

async function nextEventSequence(transaction: Transaction, draftId: string): Promise<number> {
  const aggregate = await transaction.publicIntakeEvent.aggregate({
    where: { draftId },
    _max: { sequence: true },
  })
  return (aggregate._max.sequence ?? 0) + 1
}

async function appendEvent(
  transaction: Transaction,
  input: {
    draftId: string
    type: PublicIntakeEventType
    occurredAt: Date
    fromPhase?: PublicIntakePhase
    toPhase?: PublicIntakePhase
    questionKey?: string
    answerRevisionNumber?: number
    detailCode?: string
  },
): Promise<void> {
  await transaction.publicIntakeEvent.create({
    data: {
      draftId: input.draftId,
      sequence: await nextEventSequence(transaction, input.draftId),
      type: input.type,
      occurredAt: input.occurredAt,
      fromPhase: input.fromPhase,
      toPhase: input.toPhase,
      questionKey: input.questionKey,
      answerRevisionNumber: input.answerRevisionNumber,
      detailCode: input.detailCode,
    },
  })
}

async function resolveAccess(
  transaction: Transaction,
  token: unknown,
  at: Date,
): Promise<AccessResult> {
  if (!isValidPublicIntakeToken(token)) return { kind: 'DENIED' }
  const tokenHash = hashPublicIntakeToken(token)
  const session = await transaction.publicIntakeSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      draftId: true,
      tokenHash: true,
      expiresAt: true,
      lastUsedAt: true,
      lastResumeEventAt: true,
      expiredAccessRecordedAt: true,
      revokedAt: true,
      draft: { select: { id: true, phase: true, version: true, expiresAt: true } },
    },
  })
  if (!session || session.revokedAt || !publicIntakeTokenMatches(token, session.tokenHash)) {
    return { kind: 'DENIED' }
  }

  if (isTerminalPublicIntakePhase(session.draft.phase)) {
    return { kind: 'DENIED' }
  }

  if (
    !isPublicIntakeResumable(session.expiresAt, at) ||
    !isPublicIntakeResumable(session.draft.expiresAt, at)
  ) {
    if (!session.expiredAccessRecordedAt) {
      const claimed = await transaction.publicIntakeSession.updateMany({
        where: { id: session.id, expiredAccessRecordedAt: null },
        data: { expiredAccessRecordedAt: at },
      })
      if (claimed.count === 1) {
        await appendEvent(transaction, {
          draftId: session.draftId,
          type: 'DRAFT_EXPIRED_ACCESS_REJECTED',
          occurredAt: at,
          detailCode: 'SESSION_EXPIRED',
        })
      }
    }
    return { kind: 'EXPIRED' }
  }

  return {
    kind: 'VALID',
    session: {
      id: session.id,
      draftId: session.draftId,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      lastResumeEventAt: session.lastResumeEventAt,
      draft: session.draft,
    },
  }
}

function requireAccess(result: AccessResult): asserts result is Extract<AccessResult, { kind: 'VALID' }> {
  if (result.kind !== 'VALID') throw new PublicIntakeServiceError('ACCESS_DENIED')
}

function answerValue(answer: {
  textValue: string | null
  optionValue: string | null
  numberValue: { toNumber(): number } | null
  booleanValue: boolean | null
  dateValue: Date | null
  periodValue: string | null
}): string | number | boolean | null {
  return (
    answer.textValue ??
    answer.optionValue ??
    answer.numberValue?.toNumber() ??
    answer.booleanValue ??
    answer.dateValue?.toISOString().slice(0, 10) ??
    answer.periodValue ??
    null
  )
}

async function loadPublicView(
  transaction: Transaction,
  draftId: string,
): Promise<PublicIntakeDraftView> {
  const draft = await transaction.publicIntakeDraft.findUniqueOrThrow({
    where: { id: draftId },
    select: publicDraftSelect,
  })
  const { id, answers, contextQuestions, knowledgeContextId, knowledgeContextVersion, knowledgeSourceRoute, knowledgeSuggestedCategory, ...draftView } = draft
  const currentContext = resolveActiveKnowledgeContext(knowledgeContextId)
  const sectorOptions = draftView.flowVersion === PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION
    ? await getSharedSectorOptions(transaction)
    : []
  const view = {
    ...draftView,
    knowledgeContext: currentContext && knowledgeContextVersion && knowledgeSourceRoute
      ? {
          id: currentContext.id,
          version: knowledgeContextVersion,
          sourceRoute: knowledgeSourceRoute,
          shortLabel: currentContext.shortLabel,
          title: currentContext.title,
          suggestedCategory: knowledgeSuggestedCategory,
        }
      : null,
    answers: answers.map((answer) => ({
      questionKey: answer.questionKey,
      questionVersion: answer.questionVersion,
      answerType: answer.answerType,
      disposition: answer.disposition,
      source: answer.source,
      version: answer.version,
      value: answerValue(answer),
    })),
    contextQuestions: contextQuestions.map((question) =>
      toPublicIntakeContextQuestionView(question, sectorOptions),
    ),
  }

  const sharedAssignmentContext = resolveSharedAssignmentContext({
    originalInput: view.originalInput,
    answers: view.answers,
    sectorOptions,
  })

  return {
    id,
    ...view,
    sharedAssignmentContext,
    guidance: buildPublicIntakeGuidanceHandoff(id, { ...view, sharedAssignmentContext }),
  }
}

export async function createPublicIntakeDraft(
  rawInput: unknown,
  options: { at?: Date } = {},
): Promise<{ draft: PublicIntakeDraftView; sessionToken: string }> {
  const input = parseCreatePublicIntakeDraftInput(rawInput)
  const knowledgeContext = resolveActiveKnowledgeContext(input.knowledgeContextId)
  const at = options.at ?? new Date()
  const expiresAt = publicIntakeExpiryFrom(at)
  const sessionToken = generatePublicIntakeToken()
  const tokenHash = hashPublicIntakeToken(sessionToken)

  const draft = await getPrisma().$transaction(
    async (transaction) => {
      const created = await transaction.publicIntakeDraft.create({
        data: {
          phase: 'STARTED',
          entryPoint: input.entryPoint,
          originalInput: input.entryPoint === 'FREE_TEXT' ? input.originalInput : null,
          selectedRequestKey:
            input.entryPoint === 'RECOGNIZABLE_REQUEST' ? input.selectedRequestKey : null,
          knowledgeContextId: knowledgeContext?.id ?? null,
          knowledgeContextVersion: knowledgeContext?.version ?? null,
          knowledgeSourceRoute: knowledgeContext?.sourceRoutes[0] ?? null,
          knowledgeSuggestedCategory: knowledgeContext?.suggestedCategory ?? null,
          flowVersion: input.experience === 'HELP_REQUEST_V2'
            ? PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION
            : PUBLIC_INTAKE_FLOW_VERSION,
          currentStep: 'start',
          startedAt: at,
          lastInteractionAt: at,
          expiresAt,
        },
        select: { id: true },
      })
      await transaction.publicIntakeSession.create({
        data: {
          draftId: created.id,
          tokenHash,
          expiresAt,
          lastUsedAt: at,
        },
      })
      await appendEvent(transaction, {
        draftId: created.id,
        type: 'DRAFT_CREATED',
        occurredAt: at,
        detailCode: input.experience === 'HELP_REQUEST_V2'
          ? PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION
          : PUBLIC_INTAKE_FLOW_VERSION,
      })
      await appendEvent(transaction, {
        draftId: created.id,
        type:
          input.entryPoint === 'FREE_TEXT'
            ? 'ORIGINAL_INPUT_RECORDED'
            : 'ENTRY_POINT_SELECTED',
        occurredAt: at,
        detailCode:
          input.entryPoint === 'RECOGNIZABLE_REQUEST'
            ? input.selectedRequestKey
            : 'FREE_TEXT_PRESENT',
      })
      return loadPublicView(transaction, created.id)
    },
    { isolationLevel: 'Serializable' },
  )

  return { draft, sessionToken }
}

export async function getPublicIntakeDraftForSession(
  sessionToken: unknown,
  options: { at?: Date } = {},
): Promise<PublicIntakeDraftView> {
  const at = options.at ?? new Date()
  const result = await getPrisma().$transaction(
    async (transaction) => {
      const access = await resolveAccess(transaction, sessionToken, at)
      if (access.kind !== 'VALID') return { access }
      return { access, draft: await loadPublicView(transaction, access.session.draftId) }
    },
    { isolationLevel: 'Serializable' },
  )
  requireAccess(result.access)
  return result.draft!
}

export async function resumePublicIntakeDraft(
  sessionToken: unknown,
  options: { at?: Date } = {},
): Promise<PublicIntakeDraftView> {
  const at = options.at ?? new Date()
  const result = await getPrisma().$transaction(
    async (transaction) => {
      const access = await resolveAccess(transaction, sessionToken, at)
      if (access.kind !== 'VALID') return { access }
      const recordEvent = shouldRecordPublicIntakeResumeEvent(access.session.lastResumeEventAt, at)
      const advanced = await transaction.publicIntakeDraft.updateMany({
        where: { id: access.session.draftId, version: access.session.draft.version },
        data: { lastInteractionAt: at, version: { increment: 1 } },
      })
      if (advanced.count !== 1) throw new PublicIntakeServiceError('CONFLICT')
      await transaction.publicIntakeSession.update({
        where: { id: access.session.id },
        data: {
          lastUsedAt: at,
          ...(recordEvent ? { lastResumeEventAt: at } : {}),
        },
      })
      if (recordEvent) {
        await appendEvent(transaction, {
          draftId: access.session.draftId,
          type: 'DRAFT_RESUMED',
          occurredAt: at,
        })
      }
      return { access, draft: await loadPublicView(transaction, access.session.draftId) }
    },
    { isolationLevel: 'Serializable' },
  )
  requireAccess(result.access)
  return result.draft!
}

function valuesEqual(
  current: {
    disposition: string
    source: PublicIntakeAnswerSource
    textValue: string | null
    optionValue: string | null
    numberValue: { toString(): string } | null
    booleanValue: boolean | null
    dateValue: Date | null
    periodValue: string | null
  },
  next: ReturnType<typeof normalizePublicIntakeAnswer>,
  source: PublicIntakeAnswerSource,
): boolean {
  return (
    current.disposition === next.disposition &&
    current.source === source &&
    current.textValue === next.textValue &&
    current.optionValue === next.optionValue &&
    (current.numberValue?.toString() ?? null) ===
      (next.numberValue === null ? null : String(next.numberValue)) &&
    current.booleanValue === next.booleanValue &&
    (current.dateValue?.toISOString().slice(0, 10) ?? null) ===
      (next.dateValue?.toISOString().slice(0, 10) ?? null) &&
    current.periodValue === next.periodValue
  )
}

export async function recordPublicIntakeAnswer(
  sessionToken: unknown,
  rawInput: RecordPublicIntakeAnswerInput,
  options: {
    at?: Date
    answerSource?: PublicIntakeAnswerSource
  } = {},
): Promise<PublicIntakeDraftView> {
  const answer = normalizePublicIntakeAnswer(rawInput)
  const at = options.at ?? new Date()
  const requestedAnswerSource = options.answerSource ?? 'USER_INPUT'

  try {
    const result = await getPrisma().$transaction(
      async (transaction) => {
        const access = await resolveAccess(transaction, sessionToken, at)
        if (access.kind !== 'VALID') return { access }
        if (TERMINAL_OR_LATER_PHASES.includes(access.session.draft.phase)) {
          throw new PublicIntakeServiceError('INVALID_PHASE')
        }

        const plannedContextQuestion = await transaction.publicIntakeContextQuestion.findUnique({
          where: {
            draftId_questionKey: {
              draftId: access.session.draftId,
              questionKey: answer.questionKey,
            },
          },
          select: { questionKey: true },
        })
        if (getAIContextQuestion(answer.questionKey) && !plannedContextQuestion) {
          throw new PublicIntakeServiceError('VALIDATION_ERROR')
        }
        if (
          answer.questionKey === SHARED_CONTEXT_SECTOR_QUESTION_KEY &&
          answer.disposition === 'ANSWERED'
        ) {
          const sectors = await getSharedSectorOptions(transaction)
          if (!sectors.some((sector) => sector.code === answer.optionValue)) {
            throw new PublicIntakeServiceError('VALIDATION_ERROR')
          }
        }
        const answerSource = plannedContextQuestion
          ? 'AI_CONTEXT_PLANNER'
          : requestedAnswerSource

        const current = await transaction.publicIntakeAnswer.findUnique({
          where: {
            draftId_questionKey: {
              draftId: access.session.draftId,
              questionKey: answer.questionKey,
            },
          },
        })
        if (current && valuesEqual(current, answer, answerSource)) {
          return { access, draft: await loadPublicView(transaction, access.session.draftId) }
        }

        const nextRevision = (current?.version ?? 0) + 1
        const valueData = {
          questionVersion: answer.questionVersion,
          answerType: answer.answerType,
          disposition: answer.disposition,
          source: answerSource,
          textValue: answer.textValue,
          optionValue: answer.optionValue,
          numberValue: answer.numberValue,
          booleanValue: answer.booleanValue,
          dateValue: answer.dateValue,
          periodValue: answer.periodValue,
        }
        const stored = current
          ? await transaction.publicIntakeAnswer.update({
              where: { id: current.id },
              data: { ...valueData, version: nextRevision },
              select: { id: true },
            })
          : await transaction.publicIntakeAnswer.create({
              data: {
                draftId: access.session.draftId,
                questionKey: answer.questionKey,
                ...valueData,
              },
              select: { id: true },
            })

        await transaction.publicIntakeAnswerRevision.create({
          data: {
            draftId: access.session.draftId,
            answerId: stored.id,
            questionKey: answer.questionKey,
            revisionNumber: nextRevision,
            ...valueData,
          },
        })

        const nextPhase =
          access.session.draft.phase === 'STARTED' ? 'CLARIFYING' : access.session.draft.phase
        const advanced = await transaction.publicIntakeDraft.updateMany({
          where: { id: access.session.draftId, version: access.session.draft.version },
          data: {
            phase: nextPhase,
            currentStep: answer.questionKey,
            lastInteractionAt: at,
            version: { increment: 1 },
          },
        })
        if (advanced.count !== 1) throw new PublicIntakeServiceError('CONFLICT')

        await appendEvent(transaction, {
          draftId: access.session.draftId,
          type:
            answer.disposition === 'ANSWERED'
              ? current
                ? 'ANSWER_REVISED'
                : 'ANSWER_RECORDED'
              : 'QUESTION_SKIPPED',
          occurredAt: at,
          questionKey: answer.questionKey,
          answerRevisionNumber: nextRevision,
          detailCode: answer.disposition,
        })
        if (nextPhase !== access.session.draft.phase) {
          await appendEvent(transaction, {
            draftId: access.session.draftId,
            type: 'PHASE_CHANGED',
            occurredAt: at,
            fromPhase: access.session.draft.phase,
            toPhase: nextPhase,
            detailCode: 'FIRST_ANSWER',
          })
        }
        return { access, draft: await loadPublicView(transaction, access.session.draftId) }
      },
      { isolationLevel: 'Serializable' },
    )
    requireAccess(result.access)
    return result.draft!
  } catch (error) {
    if (error instanceof PublicIntakeServiceError) throw error
    if (isPrismaConflict(error)) throw new PublicIntakeServiceError('CONFLICT')
    throw error
  }
}

export async function changePublicIntakePhase(
  sessionToken: unknown,
  toPhase: PublicIntakePhase,
  options: { at?: Date } = {},
): Promise<PublicIntakeDraftView> {
  const at = options.at ?? new Date()
  const result = await getPrisma().$transaction(
    async (transaction) => {
      const access = await resolveAccess(transaction, sessionToken, at)
      if (access.kind !== 'VALID') return { access }
      const fromPhase = access.session.draft.phase
      if (!canChangePublicIntakePhase(fromPhase, toPhase)) {
        throw new PublicIntakeServiceError('INVALID_PHASE')
      }
      const changed = await transaction.publicIntakeDraft.updateMany({
        where: { id: access.session.draftId, version: access.session.draft.version },
        data: {
          phase: toPhase,
          lastInteractionAt: at,
          version: { increment: 1 },
        },
      })
      if (changed.count !== 1) throw new PublicIntakeServiceError('CONFLICT')
      await appendEvent(transaction, {
        draftId: access.session.draftId,
        type: 'PHASE_CHANGED',
        occurredAt: at,
        fromPhase,
        toPhase,
        detailCode: 'EXPLICIT_SERVICE_TRANSITION',
      })
      return { access, draft: await loadPublicView(transaction, access.session.draftId) }
    },
    { isolationLevel: 'Serializable' },
  )
  requireAccess(result.access)
  return result.draft!
}

export type AbandonPublicIntakeDraftResult = {
  outcome: 'ABANDONED' | 'ALREADY_ABANDONED'
}

async function abandonPublicIntakeDraftAttempt(
  sessionToken: unknown,
  at: Date,
): Promise<AbandonPublicIntakeDraftResult> {
  if (!isValidPublicIntakeToken(sessionToken)) {
    throw new PublicIntakeServiceError('ACCESS_DENIED')
  }
  const tokenHash = hashPublicIntakeToken(sessionToken)

  return getPrisma().$transaction(
    async (transaction) => {
      const session = await transaction.publicIntakeSession.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          tokenHash: true,
          expiresAt: true,
          revokedAt: true,
          draft: {
            select: {
              id: true,
              phase: true,
              version: true,
              expiresAt: true,
            },
          },
        },
      })

      if (!session || !publicIntakeTokenMatches(sessionToken, session.tokenHash)) {
        throw new PublicIntakeServiceError('ACCESS_DENIED')
      }
      if (session.draft.phase === 'ABANDONED_BY_USER') {
        return { outcome: 'ALREADY_ABANDONED' }
      }
      if (
        session.revokedAt ||
        !isPublicIntakeResumable(session.expiresAt, at) ||
        !isPublicIntakeResumable(session.draft.expiresAt, at)
      ) {
        throw new PublicIntakeServiceError('ACCESS_DENIED')
      }
      if (!canAbandonPublicIntakeDraftByUser(session.draft.phase)) {
        throw new PublicIntakeServiceError('INVALID_PHASE')
      }

      const changed = await transaction.publicIntakeDraft.updateMany({
        where: {
          id: session.draft.id,
          version: session.draft.version,
          phase: session.draft.phase,
        },
        data: {
          phase: 'ABANDONED_BY_USER',
          lastInteractionAt: at,
          version: { increment: 1 },
        },
      })
      if (changed.count !== 1) throw new PublicIntakeServiceError('CONFLICT')

      const revoked = await transaction.publicIntakeSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: at, lastUsedAt: at },
      })
      if (revoked.count !== 1) throw new PublicIntakeServiceError('CONFLICT')

      await appendEvent(transaction, {
        draftId: session.draft.id,
        type: 'DRAFT_ABANDONED_BY_USER',
        occurredAt: at,
        fromPhase: session.draft.phase,
        toPhase: 'ABANDONED_BY_USER',
        detailCode: 'USER_REQUEST',
      })

      return { outcome: 'ABANDONED' }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function abandonPublicIntakeDraftByUser(
  sessionToken: unknown,
  options: { at?: Date } = {},
): Promise<AbandonPublicIntakeDraftResult> {
  const at = options.at ?? new Date()

  try {
    return await abandonPublicIntakeDraftAttempt(sessionToken, at)
  } catch (error) {
    if (error instanceof PublicIntakeServiceError && error.code !== 'CONFLICT') throw error
    if (!isPrismaConflict(error) && !(error instanceof PublicIntakeServiceError)) throw error
  }

  try {
    return await abandonPublicIntakeDraftAttempt(sessionToken, at)
  } catch (error) {
    if (error instanceof PublicIntakeServiceError) throw error
    if (isPrismaConflict(error)) throw new PublicIntakeServiceError('CONFLICT')
    throw error
  }
}
