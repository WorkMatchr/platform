import 'server-only'
import { assertF4DraftActor } from './compliance-f4-draft-authorization'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'
import { buildComplianceV2Report, canonicalJson, complianceChecksum, complianceV2AnswersSchema } from './compliance-v2'
import { loadComplianceV2Framework } from './compliance-v2-framework'
import { F4_BINDING } from './compliance-f4-catalog'

export const saveF4DraftSchema = z.object({ idempotencyKey: z.string().uuid(), revision: z.number().int().nonnegative().nullable(), answers: complianceV2AnswersSchema }).strict()
type Actor = { userId: string; organizationId: string }

export async function listF4Drafts(actor: Actor) {
  return getPrisma().$transaction(async tx => {
    await assertF4DraftActor(tx, actor)
    const runs = await tx.arboGuideRun.findMany({ where: { organizationId: actor.organizationId, completedByUserId: actor.userId, status: 'IN_PROGRESS', draftRevision: { not: null }, complianceFrameworkVersionId: F4_BINDING.id }, orderBy: { updatedAt: 'desc' }, take: 50 })
    return runs.map(r => ({ id: r.id, idempotencyKey: r.idempotencyKey, revision: r.draftRevision!, answers: r.answersSnapshot, startedAt: r.startedAt.toISOString(), updatedAt: r.updatedAt.toISOString(), frameworkId: r.complianceFrameworkVersionId }))
  })
}

export async function saveF4Draft(actor: Actor, raw: unknown) {
  const input = saveF4DraftSchema.parse(raw)
  return getPrisma().$transaction(async tx => {
    await assertF4DraftActor(tx, actor)
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`arbo-guide-run:${actor.organizationId}:${input.idempotencyKey}`}, 0))::text`)
    const existing = await tx.arboGuideRun.findUnique({ where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey: input.idempotencyKey } } })
    if (existing && (existing.completedByUserId !== actor.userId || existing.status !== 'IN_PROGRESS' || existing.draftRevision === null || existing.complianceFrameworkVersionId !== F4_BINDING.id)) throw new ArboGuideRunError('ACCESS_DENIED')
    const definition = await loadComplianceV2Framework(tx, existing?.complianceFrameworkVersionId ?? F4_BINDING.id)
    const checksum = complianceChecksum(definition)
    if (existing && existing.draftDefinitionChecksum !== checksum) throw new ArboGuideRunError('CONFLICT')
    // The existing evaluator validates unknown keys and option values; its outcome is not saved for a draft.
    buildComplianceV2Report(definition, input.answers, { organizationName: null, scannedAt: new Date().toISOString() })
    if (existing && canonicalJson(existing.answersSnapshot) === canonicalJson(input.answers) && (input.revision === existing.draftRevision || input.revision === existing.draftRevision! - 1 || input.revision === null && existing.draftRevision === 0)) return view(existing)
    if (existing ? input.revision !== existing.draftRevision : input.revision !== null) throw new ArboGuideRunError('CONFLICT')
    const run = existing ? await tx.arboGuideRun.update({ where: { id: existing.id }, data: { answersSnapshot: input.answers, draftRevision: { increment: 1 } } }) : await tx.arboGuideRun.create({ data: {
      guideType: 'COMPLIANCE', guideVersion: '2', reportVersion: '2.0', organizationId: actor.organizationId, completedByUserId: actor.userId,
      complianceFrameworkVersionId: definition.id, idempotencyKey: input.idempotencyKey, answersSnapshot: input.answers, draftRevision: 0, draftDefinitionChecksum: checksum,
    } })
    return view(run)
  }, { timeout: 15_000 })
}
function view(run: { id: string; idempotencyKey: string; draftRevision: number | null; startedAt: Date }) { return { id: run.id, idempotencyKey: run.idempotencyKey, revision: run.draftRevision!, startedAt: run.startedAt.toISOString() } }
