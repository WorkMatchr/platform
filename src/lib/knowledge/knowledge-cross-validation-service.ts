import { createHash, randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { assertPlatformAdministrator } from './knowledge-review-authorization'

type DatabaseClient = ReturnType<typeof getPrisma>

const outcomes = ['CONFIRMED', 'PARTIAL_CONDITIONAL', 'SUPERSEDED', 'CONFLICT', 'INSUFFICIENT_SUPPORT'] as const
const supportTypes = ['DIRECT_SUPPORT', 'PARTIAL_SUPPORT', 'CONTRADICTS', 'SUPERSEDES', 'CONTEXT'] as const
export type KnowledgeCrossValidationOutcome = typeof outcomes[number]
export type KnowledgeCrossValidationSupportType = typeof supportTypes[number]

export type KnowledgeCrossValidationEvidenceInput = {
  sourceBlockId: string
  blockTextHash: string
  supportType: KnowledgeCrossValidationSupportType
  sequence: number
  rationale: string
}

export type KnowledgeCrossValidationAssessmentInput = {
  claimId: string
  reviewTaskId?: string
  outcome: KnowledgeCrossValidationOutcome
  rationale: string
  checkedAt: Date
  reviewerUserId: string
  supersedesAssessmentId?: string
  evidence: KnowledgeCrossValidationEvidenceInput[]
}

type EvidenceSnapshot = KnowledgeCrossValidationEvidenceInput & {
  jurisdictionSnapshot: string
  applicabilityScopeSnapshot: string
  independenceGroupSnapshot: string
}

export class KnowledgeCrossValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'KnowledgeCrossValidationError'
  }
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stable(entry)]))
  }
  return value
}

function fingerprint(input: Omit<KnowledgeCrossValidationAssessmentInput, 'supersedesAssessmentId'>, evidence: EvidenceSnapshot[]) {
  return createHash('sha256').update(JSON.stringify(stable({
    claimId: input.claimId,
    reviewTaskId: input.reviewTaskId ?? null,
    outcome: input.outcome,
    rationale: input.rationale.trim(),
    checkedAt: input.checkedAt.toISOString(),
    reviewerUserId: input.reviewerUserId,
    evidence: [...evidence].sort((left, right) => left.sequence - right.sequence).map((item) => ({ ...item, rationale: item.rationale.trim() })),
  }))).digest('hex')
}

function validateInput(input: KnowledgeCrossValidationAssessmentInput) {
  if (!input.claimId || !input.reviewerUserId || !outcomes.includes(input.outcome)) throw new KnowledgeCrossValidationError('ASSESSMENT_INPUT_INVALID', 'De cross-validation assessment is onvolledig.')
  if (!input.rationale.trim()) throw new KnowledgeCrossValidationError('ASSESSMENT_RATIONALE_REQUIRED', 'Een assessment vereist een inhoudelijke rationale.')
  if (!(input.checkedAt instanceof Date) || Number.isNaN(input.checkedAt.getTime())) throw new KnowledgeCrossValidationError('ASSESSMENT_DATE_INVALID', 'De controledatum is ongeldig.')
  if (input.evidence.length === 0) throw new KnowledgeCrossValidationError('ASSESSMENT_EVIDENCE_REQUIRED', 'Een assessment vereist exact bronblokbewijs.')
  const sequences = input.evidence.map((item) => item.sequence)
  if (sequences.some((sequence) => !Number.isInteger(sequence) || sequence < 1) || new Set(sequences).size !== sequences.length) throw new KnowledgeCrossValidationError('ASSESSMENT_EVIDENCE_SEQUENCE_INVALID', 'De evidencevolgorde is ongeldig.')
  for (const evidence of input.evidence) {
    if (!evidence.sourceBlockId || !/^[0-9a-f]{64}$/u.test(evidence.blockTextHash) || !supportTypes.includes(evidence.supportType) || !evidence.rationale.trim()) {
      throw new KnowledgeCrossValidationError('ASSESSMENT_EVIDENCE_INVALID', 'Cross-validation evidence is onvolledig of ongeldig.')
    }
  }
}

function scopeSnapshot(source: { applicabilityScope: string | null }, scopes: Array<{ jurisdiction: string; scopeCode: string; effect: string }>) {
  const normalized = scopes
    .map((scope) => `${scope.jurisdiction}:${scope.scopeCode}:${scope.effect}`)
    .sort((left, right) => left.localeCompare(right))
  if (normalized.length > 0) return normalized.join('|')
  return source.applicabilityScope?.trim() || 'UNSPECIFIED'
}

async function resolveEvidence(tx: Prisma.TransactionClient, input: KnowledgeCrossValidationEvidenceInput[]): Promise<EvidenceSnapshot[]> {
  const ids = [...new Set(input.map((item) => item.sourceBlockId))]
  const blocks = await tx.knowledgeSourceBlock.findMany({
    where: { id: { in: ids }, sourcePage: { extractionRun: { status: 'COMPLETED' } } },
    select: {
      id: true,
      textHash: true,
      applicabilityScopes: { select: { jurisdiction: true, scopeCode: true, effect: true } },
      sourcePage: {
        select: {
          extractionRun: {
            select: {
              sourceVersion: {
                select: {
                  applicabilityScopes: { select: { jurisdiction: true, scopeCode: true, effect: true } },
                  source: {
                    select: {
                      jurisdiction: true,
                      applicabilityScope: true,
                      independenceGroup: true,
                      applicabilityScopes: { select: { jurisdiction: true, scopeCode: true, effect: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  if (blocks.length !== ids.length) throw new KnowledgeCrossValidationError('ASSESSMENT_SOURCE_BLOCK_INVALID', 'Een bronblok ontbreekt of komt niet uit een voltooide extractie.')
  const byId = new Map(blocks.map((block) => [block.id, block]))
  return input.map((item) => {
    const block = byId.get(item.sourceBlockId)!
    if (block.textHash !== item.blockTextHash) throw new KnowledgeCrossValidationError('ASSESSMENT_BLOCK_HASH_MISMATCH', 'De bronblokhash komt niet overeen.')
    const version = block.sourcePage.extractionRun.sourceVersion
    const source = version.source
    return {
      ...item,
      rationale: item.rationale.trim(),
      jurisdictionSnapshot: source.jurisdiction,
      applicabilityScopeSnapshot: scopeSnapshot(source, [...source.applicabilityScopes, ...version.applicabilityScopes, ...block.applicabilityScopes]),
      independenceGroupSnapshot: source.independenceGroup,
    }
  })
}

export async function storeKnowledgeCrossValidationAssessment(input: KnowledgeCrossValidationAssessmentInput, database: DatabaseClient = getPrisma()) {
  validateInput(input)
  return database.$transaction(async (tx) => {
    await assertPlatformAdministrator(tx, input.reviewerUserId)
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.claimId}))`)
    const claim = await tx.knowledgeClaim.findUnique({ where: { id: input.claimId }, select: { id: true } })
    if (!claim) throw new KnowledgeCrossValidationError('ASSESSMENT_CLAIM_NOT_FOUND', 'De Knowledge-claim bestaat niet.')
    if (input.reviewTaskId) {
      const task = await tx.knowledgeReviewTask.findFirst({ where: { id: input.reviewTaskId, claimId: input.claimId }, select: { id: true } })
      if (!task) throw new KnowledgeCrossValidationError('ASSESSMENT_REVIEW_TASK_MISMATCH', 'De reviewtaak hoort niet bij deze claim.')
    }
    const evidence = await resolveEvidence(tx, input.evidence)
    const contentFingerprint = fingerprint(input, evidence)
    const identical = await tx.knowledgeCrossValidationAssessment.findUnique({
      where: { claimId_contentFingerprint: { claimId: input.claimId, contentFingerprint } },
      select: { id: true, revision: true },
    })
    if (identical) return { assessmentId: identical.id, revision: identical.revision, created: false, contentFingerprint }
    const latest = await tx.knowledgeCrossValidationAssessment.findFirst({ where: { claimId: input.claimId }, orderBy: { revision: 'desc' }, select: { id: true, revision: true } })
    if ((latest?.id ?? undefined) !== input.supersedesAssessmentId) throw new KnowledgeCrossValidationError('ASSESSMENT_REPLAY_CONFLICT', 'De assessment wijkt af van de bestaande revisie of supersessionbasis.')
    const assessmentId = randomUUID()
    const revision = (latest?.revision ?? 0) + 1
    await tx.knowledgeCrossValidationAssessment.create({ data: {
      id: assessmentId,
      claimId: input.claimId,
      reviewTaskId: input.reviewTaskId,
      revision,
      outcome: input.outcome,
      rationale: input.rationale.trim(),
      checkedAt: input.checkedAt,
      reviewerUserId: input.reviewerUserId,
      contentFingerprint,
      supersedesAssessmentId: input.supersedesAssessmentId,
    } })
    for (const item of [...evidence].sort((left, right) => left.sequence - right.sequence)) {
      await tx.knowledgeCrossValidationEvidence.create({ data: {
        assessmentId,
        sourceBlockId: item.sourceBlockId,
        blockTextHash: item.blockTextHash,
        supportType: item.supportType,
        jurisdictionSnapshot: item.jurisdictionSnapshot,
        applicabilityScopeSnapshot: item.applicabilityScopeSnapshot,
        independenceGroupSnapshot: item.independenceGroupSnapshot,
        sequence: item.sequence,
        rationale: item.rationale,
      } })
    }
    return { assessmentId, revision, created: true, contentFingerprint }
  }, { isolationLevel: 'Serializable' })
}

export async function getLatestKnowledgeCrossValidationAssessment(claimId: string, database: DatabaseClient = getPrisma()) {
  return database.knowledgeCrossValidationAssessment.findFirst({
    where: { claimId },
    orderBy: { revision: 'desc' },
    include: {
      reviewer: { select: { id: true, displayName: true } },
      evidence: {
        orderBy: { sequence: 'asc' },
        include: { sourceBlock: { include: { sourcePage: { include: { extractionRun: { include: { sourceVersion: { include: { source: true } } } } } } } } },
      },
    },
  })
}
