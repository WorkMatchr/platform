import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { getPrisma } from '../src/lib/prisma'
import { buildContextGoalV2Successors } from '../src/lib/knowledge/context-goal-v2-publication'
import { currentKnowledgeImportClaimWhere } from '../src/lib/knowledge/knowledge-import-visibility'
import { INTAKE_ROUTING_KNOWLEDGE_SCOPE } from '../src/lib/public-intake/case-understanding'

const branch = 'codex/ai-help-request-intake-v2'
const packageId = 'CONTEXT_QUESTION_GENERATION_V2'
let prisma: ReturnType<typeof getPrisma> | undefined

async function main() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== branch) {
    throw new Error('CONTEXT_PUBLICATION_PREVIEW_BRANCH_REQUIRED')
  }
  // This expected fingerprint must come from independently verified Preview
  // deployment/provider identity, never from hashing the candidate URL itself.
  const expected = process.env.CONTEXT_GOAL_PUBLICATION_PREVIEW_HOST_SHA256
  if (!expected || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('CONTEXT_PUBLICATION_PREVIEW_IDENTITY_REQUIRED')
  const url = new URL(process.env.DATABASE_URL ?? '')
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('CONTEXT_PUBLICATION_DATABASE_PROTOCOL_INVALID')
  const host = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '')
  if (createHash('sha256').update(host).digest('hex') !== expected) throw new Error('CONTEXT_PUBLICATION_PREVIEW_IDENTITY_MISMATCH')

  const review = JSON.parse(await readFile(new URL('../data/knowledge/review/case-understanding-10-scenario-review-v1.json', import.meta.url), 'utf8')) as unknown
  const generationPackage = JSON.parse(await readFile(new URL('../data/knowledge/review/context-question-generation-v2.json', import.meta.url), 'utf8')) as unknown
  prisma = getPrisma()
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(30420830)`
    const existingRules = await tx.knowledgeRule.findMany({
      where: { code: { startsWith: 'CASE_GOAL_' }, ruleVersion: 2,
        publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED',
        usageScopes: { has: INTAKE_ROUTING_KNOWLEDGE_SCOPE } },
      select: { code: true, ruleVersion: true, outputSchema: true },
    })
    const successors = buildContextGoalV2Successors({ review, generationPackage, existingRules })
    const supportIds = [...new Set(successors.flatMap((rule) => rule.outputSchema.supportingKnowledgeIds))]
    const eligibleClaims = await tx.knowledgeClaim.findMany({
      where: { AND: [currentKnowledgeImportClaimWhere], id: { in: supportIds },
        publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', temporalStatus: 'CURRENT',
        sourceControlStatus: 'CONTROL_COMPLETE', accessTier: 'PUBLIC_BASIC',
        usageScopes: { has: INTAKE_ROUTING_KNOWLEDGE_SCOPE }, topic: { status: 'ACTIVE' },
        citations: { some: { supportType: { in: ['DIRECT_SUPPORT', 'PARTIAL_SUPPORT', 'CONTEXT'] } } } },
      select: { id: true },
    })
    if (eligibleClaims.length !== supportIds.length) throw new Error('CONTEXT_PUBLICATION_SUPPORTING_CLAIM_INVALID')
    let created = 0
    for (const rule of successors) {
      const existing = await tx.knowledgeRule.findUnique({
        where: { code_ruleVersion: { code: rule.code, ruleVersion: rule.ruleVersion } },
      })
      if (existing) {
        if (!isDeepStrictEqual(existing.outputSchema, rule.outputSchema)
          || existing.publicationStatus !== 'PUBLISHED' || existing.validationStatus !== 'VALIDATED') {
          throw new Error('CONTEXT_PUBLICATION_EXISTING_VERSION_CONFLICT')
        }
        continue
      }
      await tx.knowledgeRule.create({ data: {
        ...rule, description: 'Contextvraagcontract v2: afzonderlijke applicability, redactioneel voorbeeld en casusgebonden vraagformulering.',
        ruleType: 'ROUTING_RULE', inputSchema: { scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
        expression: rule.outputSchema.applicability, validationStatus: 'VALIDATED', publicationStatus: 'PUBLISHED',
        accessTier: 'PUBLIC_BASIC', usageScopes: [INTAKE_ROUTING_KNOWLEDGE_SCOPE],
      } })
      created += 1
    }
    if (created > 0) await tx.knowledgeAuditEvent.create({ data: {
      eventType: 'IMPORT_COMPLETED', entityType: 'ContextGoalGovernancePackage', actorType: 'AUTHORIZED_PREVIEW_PUBLICATION',
      result: 'PUBLISHED_PREVIEW', reason: 'Expliciet geautoriseerde additieve Context Goal v2-publicatie; bestaande claims en regelhistorie ongewijzigd.',
      metadata: { packageId, branch, ruleVersion: 3, created, total: successors.length },
    } })
    return { created, existing: successors.length - created, total: successors.length }
  }, { isolationLevel: 'Serializable', timeout: 60_000 })
  console.info('[context-goal-v2-preview-publication]', result)
}

try {
  await main()
} catch (error) {
  console.error('[context-goal-v2-preview-publication]', {
    code: error instanceof Error && /^CONTEXT_(?:PUBLICATION|GOAL_V2)_[A-Z_]+$/.test(error.message)
      ? error.message : 'CONTEXT_PUBLICATION_FAILED',
  })
  process.exitCode = 1
} finally {
  await prisma?.$disconnect()
}
