import 'server-only'

import { createHash } from 'node:crypto'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'

export const arboGuideTypes = ['COMPLIANCE', 'BHV', 'RIE', 'RISK'] as const
export const arboGuideResultStatuses = ['ORDER', 'ACTION', 'CHECK', 'NOT_APPLICABLE'] as const

const scalar = z.union([z.string().max(120), z.number().finite(), z.boolean(), z.null()])
const answerSnapshotSchema = z.record(z.string().min(1).max(80), scalar)
const sourceSnapshotSchema = z.object({
  id: z.string().min(1).max(120), title: z.string().min(1).max(300), publisher: z.string().min(1).max(200),
  url: z.string().url().startsWith('https://'), reviewedAt: z.string().date(),
})
const reportResultSchema = z.object({
  id: z.string().min(1).max(80), title: z.string().min(1).max(200), status: z.enum(arboGuideResultStatuses),
  statusLabel: z.string().min(1).max(80), explanation: z.string().min(1).max(2_000), nextStep: z.string().min(1).max(2_000),
  relevance: z.string().min(1).max(2_000), sources: z.array(sourceSnapshotSchema).max(30),
  extended: z.object({
    answerKeys: z.array(z.string().min(1).max(80)).max(50),
    legalBasisAvailable: z.boolean(),
    priority: z.enum(['HIGH', 'NORMAL']),
  }),
})
export const arboGuideReportSnapshotSchema = z.object({
  schemaVersion: z.literal(1), tier: z.enum(['BASIC', 'EXTENDED']), organizationName: z.string().max(160).nullable(),
  scannedAt: z.string().datetime(), assessmentVersion: z.number().int().positive(), reportVersion: z.string().min(1).max(32),
  summary: z.object({ order: z.number().int().nonnegative(), action: z.number().int().nonnegative(), check: z.number().int().nonnegative(), notApplicable: z.number().int().nonnegative() }),
  results: z.array(reportResultSchema).min(1).max(100), attentionItems: z.array(reportResultSchema).max(100),
  sources: z.array(sourceSnapshotSchema).max(100), disclaimer: z.string().min(1).max(3_000), extendedCapabilities: z.array(z.string().max(80)).max(30),
})

const completionSchema = z.object({
  guideType: z.enum(arboGuideTypes), guideVersion: z.string().min(1).max(32), reportVersion: z.string().min(1).max(32),
  organizationId: z.string().uuid(), completedByUserId: z.string().uuid(), idempotencyKey: z.string().min(8).max(160),
  startedAt: z.date(), completedAt: z.date(), answersSnapshot: answerSnapshotSchema, reportSnapshot: arboGuideReportSnapshotSchema,
})

export type ArboGuideCompletionInput = z.input<typeof completionSchema>
export type ArboGuideReportSnapshot = z.output<typeof arboGuideReportSnapshotSchema>

export class ArboGuideRunError extends Error {
  constructor(public readonly code: 'ACCESS_DENIED' | 'NOT_FOUND' | 'INVALID_INPUT' | 'CONFLICT') { super(code) }
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
  return value
}

export function fingerprintArboGuideRun(input: Pick<z.output<typeof completionSchema>, 'guideType' | 'guideVersion' | 'reportVersion' | 'answersSnapshot' | 'reportSnapshot'>) {
  return createHash('sha256').update(JSON.stringify(stable(input))).digest('hex')
}

const prefixes = { COMPLIANCE: 'CW', BHV: 'BHV', RIE: 'RIE', RISK: 'RSK' } as const
const MAX_SERIALIZABLE_ATTEMPTS = 5

function isRetryableTransactionConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2034')
}

async function allocateReportNumber(tx: Prisma.TransactionClient, guideType: keyof typeof prefixes, year: number) {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`arbo-guide:${guideType}:${year}`}, 0))::text AS "lock"`)
  const rows = await tx.$queryRaw<Array<{ nextNumber: number }>>(Prisma.sql`
    INSERT INTO "ArboGuideRunCounter" ("guideType", "year", "nextNumber", "updatedAt")
    VALUES (${guideType}::"ArboGuideType", ${year}, 1, NOW())
    ON CONFLICT ("guideType", "year") DO UPDATE SET "nextNumber" = "ArboGuideRunCounter"."nextNumber" + 1, "updatedAt" = NOW()
    RETURNING "nextNumber"
  `)
  if (!rows[0]?.nextNumber) throw new ArboGuideRunError('CONFLICT')
  return `${prefixes[guideType]}-${year}-${String(rows[0].nextNumber).padStart(6, '0')}`
}

export async function completeArboGuideRun(raw: unknown) {
  const parsed = completionSchema.safeParse(raw)
  if (!parsed.success || parsed.data.completedAt < parsed.data.startedAt) throw new ArboGuideRunError('INVALID_INPUT')
  const input = parsed.data
  const fingerprint = fingerprintArboGuideRun(input)

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await getPrisma().$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`arbo-guide-run:${input.organizationId}:${input.idempotencyKey}`}, 0))::text AS "lock"`)
        const membership = await tx.organizationMembership.findUnique({
          where: { userId: input.completedByUserId },
          select: { organizationId: true, status: true, user: { select: { status: true } }, organization: { select: { status: true, organizationType: true } } },
        })
        if (!membership || membership.organizationId !== input.organizationId || membership.status !== 'ACTIVE' || membership.user.status !== 'ACTIVE' || membership.organization.status !== 'ACTIVE' || membership.organization.organizationType === 'PLATFORM_OPERATOR') throw new ArboGuideRunError('ACCESS_DENIED')

        const existing = await tx.arboGuideRun.findUnique({ where: { organizationId_idempotencyKey: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey } } })
        if (existing?.status === 'COMPLETED') {
          if (existing.snapshotFingerprint !== fingerprint) throw new ArboGuideRunError('CONFLICT')
          return { id: existing.id, reportNumber: existing.reportNumber!, created: false }
        }
        if (existing && JSON.stringify(stable(existing.answersSnapshot)) !== JSON.stringify(stable(input.answersSnapshot))) throw new ArboGuideRunError('CONFLICT')

        const run = existing ?? await tx.arboGuideRun.create({ data: {
          guideType: input.guideType, guideVersion: input.guideVersion, reportVersion: input.reportVersion,
          organizationId: input.organizationId, completedByUserId: input.completedByUserId, idempotencyKey: input.idempotencyKey,
          startedAt: input.startedAt, answersSnapshot: input.answersSnapshot,
        } })
        const reportNumber = await allocateReportNumber(tx, input.guideType, input.completedAt.getUTCFullYear())
        await tx.arboGuideRunResult.createMany({ data: input.reportSnapshot.results.map((result, index) => ({
          arboGuideRunId: run.id, position: index + 1, subjectCode: result.id, title: result.title, status: result.status,
          explanation: result.explanation, recommendedAction: result.nextStep, sourceIdsSnapshot: result.sources.map((source) => source.id),
        })) })
        const updated = await tx.arboGuideRun.updateMany({ where: { id: run.id, status: 'IN_PROGRESS' }, data: {
          status: 'COMPLETED', reportNumber, completedAt: input.completedAt,
          reportSnapshot: JSON.parse(JSON.stringify(input.reportSnapshot)) as Prisma.InputJsonValue,
          snapshotFingerprint: fingerprint,
        } })
        if (updated.count !== 1) throw new ArboGuideRunError('CONFLICT')
        return { id: run.id, reportNumber, created: true }
      }, { isolationLevel: 'Serializable', timeout: 15_000 })
    } catch (error) {
      if (!isRetryableTransactionConflict(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS) throw error
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, attempt * 20))
    }
  }
  throw lastError
}

export type ArboGuideViewer = Readonly<{ userId: string; organizationId: string }>

async function assertArboGuideViewer(viewer: ArboGuideViewer) {
  const membership = await getPrisma().organizationMembership.findUnique({
    where: { userId: viewer.userId },
    select: { organizationId: true, status: true, user: { select: { status: true } }, organization: { select: { status: true, organizationType: true } } },
  })
  if (!membership || membership.organizationId !== viewer.organizationId || membership.status !== 'ACTIVE' || membership.user.status !== 'ACTIVE' || membership.organization.status !== 'ACTIVE' || membership.organization.organizationType === 'PLATFORM_OPERATOR') throw new ArboGuideRunError('ACCESS_DENIED')
}

export async function listArboGuideRuns(viewer: ArboGuideViewer) {
  await assertArboGuideViewer(viewer)
  return getPrisma().arboGuideRun.findMany({
    where: { organizationId: viewer.organizationId, status: 'COMPLETED' }, orderBy: { completedAt: 'desc' },
    select: { id: true, reportNumber: true, guideType: true, guideVersion: true, reportVersion: true, completedAt: true, reportSnapshot: true },
  })
}

export async function getArboGuideRun(viewer: ArboGuideViewer, runId: string) {
  await assertArboGuideViewer(viewer)
  const run = await getPrisma().arboGuideRun.findUnique({ where: { id: runId }, include: { results: { orderBy: { position: 'asc' } } } })
  if (!run || run.organizationId !== viewer.organizationId || run.status !== 'COMPLETED') throw new ArboGuideRunError('NOT_FOUND')
  return { ...run, reportSnapshot: arboGuideReportSnapshotSchema.parse(run.reportSnapshot) }
}
